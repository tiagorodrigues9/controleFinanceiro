const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const auth = require('../middleware/auth');
const sanitizeNumericFields = require('../middleware/sanitizeNumeric');
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const { asyncHandler } = require('../utils/errors');

// Aplicar middlewares
router.use(auth);
router.use(sanitizeNumericFields);

// @route   POST /api/transferencias
// @desc    Realizar transferência entre contas bancárias
// @access  Private
router.post('/', [
  body('contaOrigem').notEmpty().withMessage('Conta de origem é obrigatória'),
  body('contaDestino').notEmpty().withMessage('Conta de destino é obrigatória'),
  body('valor').isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que zero'),
  body('motivo').optional().trim()
], asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaOrigem, contaDestino, valor, motivo } = req.body;
    const userId = req.user._id;

    // Verificar se as contas existem e pertencem ao usuário
    const [origem, destino] = await Promise.all([
      ContaBancaria.findOne({ _id: contaOrigem, usuario: userId, ativo: { $ne: false } }),
      ContaBancaria.findOne({ _id: contaDestino, usuario: userId, ativo: { $ne: false } })
    ]);

    if (!origem) {
      return res.status(404).json({ message: 'Conta de origem não encontrada ou inativa' });
    }

    if (!destino) {
      return res.status(404).json({ message: 'Conta de destino não encontrada ou inativa' });
    }

    if (contaOrigem === contaDestino) {
      return res.status(400).json({ message: 'Não é possível transferir para a mesma conta' });
    }

    // Usar transação para garantir consistência
    const session = await require('mongoose').startSession();
    session.startTransaction();

    // Gerar ID único para a transferência
    const transferenciaId = new mongoose.Types.ObjectId();

    try {
      // Criar registro de saída na conta de origem
      await Extrato.create([{
        contaBancaria: contaOrigem,
        tipo: 'Saída',
        valor: parseFloat(valor),
        data: new Date(),
        motivo: motivo || `Transferência para ${destino.nome}`,
        referencia: {
          tipo: 'Transferencia',
          id: transferenciaId
        },
        usuario: userId
      }], { session });

      // Criar registro de entrada na conta de destino
      await Extrato.create([{
        contaBancaria: contaDestino,
        tipo: 'Entrada',
        valor: parseFloat(valor),
        data: new Date(),
        motivo: motivo || `Transferência de ${origem.nome}`,
        referencia: {
          tipo: 'Transferencia',
          id: transferenciaId
        },
        usuario: userId
      }], { session });

      await session.commitTransaction();

      logger.info('Transferência realizada com sucesso', {
        userId,
        contaOrigem: origem.nome,
        contaDestino: destino.nome,
        valor: parseFloat(valor),
        motivo
      });

      res.json({
        message: 'Transferência realizada com sucesso',
        transferencia: {
          origem: {
            id: origem._id,
            nome: origem.nome,
            banco: origem.banco
          },
          destino: {
            id: destino._id,
            nome: destino.nome,
            banco: destino.banco
          },
          valor: parseFloat(valor),
          motivo: motivo || `Transferência para ${destino.nome}`,
          data: new Date()
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    logger.error('Erro ao realizar transferência', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      body: req.body
    });
    res.status(500).json({ message: 'Erro ao realizar transferência' });
  }
}));

// @route   GET /api/transferencias
// @desc    Obter histórico de transferências do usuário
// @access  Private
router.get('/', asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    // Buscar transferências (extratos com referência tipo 'Transferencia' e tipo 'Saída')
    const transferenciasSaida = await Extrato.find({
      usuario: userId,
      'referencia.tipo': 'Transferencia',
      tipo: 'Saída'
    })
    .populate('contaBancaria', 'nome banco')
    .sort({ data: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Para cada transferência de saída, buscar a entrada correspondente
    const transferencias = await Promise.all(
      transferenciasSaida.map(async (saida) => {
        const entrada = await Extrato.findOne({
          usuario: userId,
          'referencia.tipo': 'Transferencia',
          'referencia.id': saida.referencia.id,
          tipo: 'Entrada'
        }).populate('contaBancaria', 'nome banco');

        return {
          ...saida.toObject(),
          contaDestino: entrada?.contaBancaria || null
        };
      })
    );

    const total = await Extrato.countDocuments({
      usuario: userId,
      'referencia.tipo': 'Transferencia',
      tipo: 'Saída'  // ✅ Apenas saídas
    });

    res.json({
      transferencias,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erro ao buscar transferências', {
      error: error.message,
      userId: req.user._id
    });
    res.status(500).json({ message: 'Erro ao buscar transferências' });
  }
}));

// @route   DELETE /api/transferencias/:id
// @desc    Excluir transferência (apenas usuário dono)
// @access  Private
router.delete('/:id', asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const transferenciaId = req.params.id;

    // Buscar transferência para verificar se existe e pertence ao usuário
    const transferencia = await Extrato.findOne({
      _id: transferenciaId,
      usuario: userId,
      'referencia.tipo': 'Transferencia'
    }).populate('contaBancaria', 'nome banco');

    if (!transferencia) {
      return res.status(404).json({ message: 'Transferência não encontrada' });
    }

    // Buscar transferência reversa (entrada correspondente)
    let transferenciaReversa = await Extrato.findOne({
      usuario: userId,
      'referencia.id': transferenciaId,
      'referencia.tipo': 'Transferencia',
      tipo: 'Entrada'
    });

    // Se não encontrar a entrada correspondente, buscar por critérios mais precisos
    if (!transferenciaReversa) {
      // Extrair nome da conta de destino do motivo
      const nomeContaDestino = transferencia.motivo.includes('Transferência para') 
        ? transferencia.motivo.replace('Transferência para ', '').trim()
        : transferencia.motivo.includes('Transferência de') 
          ? transferencia.motivo.replace('Transferência de ', '').trim()
          : null;
      
      if (nomeContaDestino) {
        // Buscar conta bancária pelo nome
        const contaDestino = await ContaBancaria.findOne({
          usuario: userId,
          nome: nomeContaDestino,
          ativo: { $ne: false }
        });
        
        if (contaDestino) {
          // Buscar entrada pela conta de destino, valor e data
          transferenciaReversa = await Extrato.findOne({
            usuario: userId,
            tipo: 'Entrada',
            contaBancaria: contaDestino._id,
            valor: transferencia.valor,
            data: {
              $gte: new Date(transferencia.data.getTime() - 60000), // 1 minuto antes
              $lt: new Date(transferencia.data.getTime() + 60000)  // 1 minuto depois
            }
          });
        }
      }
      
      // Se ainda não encontrar, buscar apenas por valor e data (fallback)
      if (!transferenciaReversa) {
        transferenciaReversa = await Extrato.findOne({
          usuario: userId,
          tipo: 'Entrada',
          valor: transferencia.valor,
          data: {
            $gte: new Date(transferencia.data.getTime() - 60000),
            $lt: new Date(transferencia.data.getTime() + 60000)
          }
        });
      }
    }

    // Usar transação para garantir consistência
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // IDs para excluir
      const idsParaExcluir = [transferenciaId];
      
      // Adicionar a entrada correspondente se encontrada
      if (transferenciaReversa) {
        idsParaExcluir.push(transferenciaReversa._id);
      }

      // Excluir ambas as transferências (saída e entrada)
      await Extrato.deleteMany({ 
        _id: { $in: idsParaExcluir },
        usuario: userId 
      }, { session });

      await session.commitTransaction();

      logger.info('Transferência excluída com sucesso', {
        userId,
        transferenciaId,
        contaOrigem: transferencia.contaBancaria?.nome,
        contaDestino: transferencia.motivo.includes('Transferência para') ? 
          transferencia.motivo.replace('Transferência para ', '') : 
          transferencia.contaBancaria?.nome,
        valor: transferencia.valor,
        excluidos: idsParaExcluir.length
      });

      res.json({ 
        message: 'Transferência excluída com sucesso',
        excluidos: idsParaExcluir.length
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (error) {
    logger.error('Erro ao excluir transferência', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id,
      transferenciaId: req.params.id
    });
    res.status(500).json({ message: 'Erro ao excluir transferência' });
  }
}));

module.exports = router;
