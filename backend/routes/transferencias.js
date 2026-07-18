const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');
const { asyncHandler } = require('../utils/errors');
const validateObjectId = require('../middleware/validateObjectId');

// Aplicar middlewares
router.param('id', validateObjectId);
router.use(auth);

// @route   POST /api/transferencias
// @desc    Realizar transferência entre contas bancárias
// @access  Private
router.post('/', [
  body('contaOrigem').notEmpty().withMessage('Conta de origem é obrigatória'),
  body('contaDestino').notEmpty().withMessage('Conta de destino é obrigatória'),
  body('valor').isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que zero'),
  body('motivo').optional().trim(),
  body('data').optional().isISO8601().withMessage('Data inválida').toDate()
], asyncHandler(async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaOrigem, contaDestino, valor, motivo, data } = req.body;
    const userId = req.user._id;

    // Tratar data retroativa (limite de 1 ano)
    const dataTransferencia = data ? new Date(data) : new Date();
    const dataMinima = new Date();
    dataMinima.setFullYear(dataMinima.getFullYear() - 1);

    if (dataTransferencia < dataMinima) {
      return res.status(400).json({ message: 'Não é possível registrar transferências com mais de 1 ano de retroatividade.' });
    }

    if (dataTransferencia > new Date()) {
      return res.status(400).json({ message: 'A data não pode estar no futuro.' });
    }

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
    const session = await mongoose.startSession();
    session.startTransaction();

    // Gerar ID único para a transferência
    const transferenciaId = new mongoose.Types.ObjectId();

    try {
      // Criar registro de saída na conta de origem
      await Extrato.create([{
        contaBancaria: contaOrigem,
        tipo: 'Saída',
        valor: parseFloat(valor),
        data: dataTransferencia,
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
        data: dataTransferencia,
        motivo: motivo || `Transferência de ${origem.nome}`,
        referencia: {
          tipo: 'Transferencia',
          id: transferenciaId
        },
        usuario: userId
      }], { session });

      // Atualizar Saldos reais das Contas
      await ContaBancaria.findByIdAndUpdate(contaOrigem, { $inc: { saldo: -parseFloat(valor) } }, { session });
      await ContaBancaria.findByIdAndUpdate(contaDestino, { $inc: { saldo: parseFloat(valor) } }, { session });

      await session.commitTransaction();

      logger.info('Transferência realizada com sucesso', {
        userId,
        contaOrigem: origem.nome,
        contaDestino: destino.nome,
        valor: parseFloat(valor),
        motivo,
        data: dataTransferencia
      });

      res.status(201).json({
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
          data: dataTransferencia
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
    // Sanitização de página e limite
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    // Buscar transferências de saída primeiro para paginar e ordenar
    const transferenciasSaida = await Extrato.find({
      usuario: userId,
      'referencia.tipo': 'Transferencia',
      tipo: 'Saída'
    })
    .populate('contaBancaria', 'nome banco')
    .sort({ data: -1, createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

    // Extrair os IDs de referência compartilhados
    const referenciasIds = transferenciasSaida.map(t => t.referencia.id);

    // Buscar TODAS as entradas correspondentes NUMA ÚNICA QUERY (evitando N+1)
    const transferenciasEntrada = await Extrato.find({
      usuario: userId,
      'referencia.tipo': 'Transferencia',
      'referencia.id': { $in: referenciasIds },
      tipo: 'Entrada'
    }).populate('contaBancaria', 'nome banco');

    // Mapear entradas por id de referencia para acesso rápido
    const entradasMap = {};
    transferenciasEntrada.forEach(entrada => {
      entradasMap[entrada.referencia.id.toString()] = entrada.contaBancaria;
    });

    // Construir o payload combinando saída e destino
    const transferencias = transferenciasSaida.map(saida => {
      const refIdStr = saida.referencia.id.toString();
      return {
        ...saida.toObject(),
        contaDestino: entradasMap[refIdStr] || null
      };
    });

    const total = await Extrato.countDocuments({
      usuario: userId,
      'referencia.tipo': 'Transferencia',
      tipo: 'Saída'
    });

    res.json({
      transferencias,
      pagination: {
        page,
        limit,
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
    const transferenciaId = req.params.id; // Isso é o _id do extrato clicado no Frontend

    // 1. Buscar o extrato para descobrir qual é o `referencia.id` compartilhado da transferência
    const extratoAlvo = await Extrato.findOne({
      _id: transferenciaId,
      usuario: userId,
      'referencia.tipo': 'Transferencia'
    });

    if (!extratoAlvo) {
      return res.status(404).json({ message: 'Transferência não encontrada.' });
    }

    const referenciaCompartilhadaId = extratoAlvo.referencia.id;

    if (!referenciaCompartilhadaId) {
       return res.status(400).json({ message: 'Falha na integridade da transferência. Referência ausente.' });
    }

    // Usar transação para garantir exclusão das duas pontas simultaneamente
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Encontrar todos os extratos atrelados para reverter os saldos
      const extratosEnvolvidos = await Extrato.find({
        'referencia.id': referenciaCompartilhadaId,
        'referencia.tipo': 'Transferencia',
        usuario: userId 
      }).session(session);

      // Reverter saldos reais (Devolver dinheiro da saída e subtrair dinheiro da entrada)
      for (const extrato of extratosEnvolvidos) {
        if (extrato.tipo === 'Saída') {
          await ContaBancaria.findByIdAndUpdate(extrato.contaBancaria, { $inc: { saldo: extrato.valor } }, { session });
        } else if (extrato.tipo === 'Entrada') {
          await ContaBancaria.findByIdAndUpdate(extrato.contaBancaria, { $inc: { saldo: -extrato.valor } }, { session });
        }
      }

      // Excluir TODOS os extratos que possuam essa mesma referencia compartilhada
      // (Isso exclui perfeitamente a Entrada e a Saída, limpando qualquer necessidade de fallbacks e regex textuais)
      const resultado = await Extrato.deleteMany({ 
        'referencia.id': referenciaCompartilhadaId,
        'referencia.tipo': 'Transferencia',
        usuario: userId 
      }, { session });

      await session.commitTransaction();

      logger.info('Transferência excluída com sucesso', {
        userId,
        extratoIniciador: transferenciaId,
        referenciaCompartilhada: referenciaCompartilhadaId,
        excluidos: resultado.deletedCount
      });

      res.json({ 
        message: 'Transferência excluída com sucesso',
        excluidos: resultado.deletedCount
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
