const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const auth = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/extrato
// @desc    Obter extrato
// @access  Private
router.get('/', async (req, res) => {
  try {
    console.log('=== EXTRATO DEBUG ===');
    console.log('req.user._id:', req.user._id);
    console.log('req.query:', req.query);
    
    const { contaBancaria, tipoDespesa, cartao, dataInicio, dataFim } = req.query;
    const query = { usuario: req.user._id, estornado: false };

    if (contaBancaria) {
      query.contaBancaria = contaBancaria;
    }

    if (cartao) {
      query.cartao = cartao;
    }

    if (dataInicio && dataFim) {
      // Criar datas em UTC para evitar problemas de timezone
      const [inicioYear, inicioMonth, inicioDay] = dataInicio.split('-').map(Number);
      const [fimYear, fimMonth, fimDay] = dataFim.split('-').map(Number);

      query.data = {
        $gte: new Date(Date.UTC(inicioYear, inicioMonth - 1, inicioDay, 0, 0, 0)),
        $lte: new Date(Date.UTC(fimYear, fimMonth - 1, fimDay, 23, 59, 59))
      };
    }

    console.log('Query para extratos:', query);

    // Otimização: mover filtro de tipoDespesa para MongoDB usando aggregation
    let extratos;
    
    if (tipoDespesa) {
      // Usar aggregation para filtro de tipoDespesa no banco
      extratos = await Extrato.aggregate([
        { $match: query },
        { 
          $lookup: {
            from: 'gastos',
            localField: 'referencia.id',
            foreignField: '_id',
            as: 'gastoRef',
            pipeline: [
              {
                $match: {
                  'tipoDespesa.grupo': new mongoose.Types.ObjectId(tipoDespesa)
                }
              }
            ]
          }
        },
        {
          $match: {
            $or: [
              { 'referencia.tipo': { $ne: 'Gasto' } },
              { 'gastoRef.0': { $exists: true } }
            ]
          }
        },
        {
          $lookup: {
            from: 'contabancarias',
            localField: 'contaBancaria',
            foreignField: '_id',
            as: 'contaBancaria'
          }
        },
        { $unwind: { path: '$contaBancaria', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'cartoes',
            localField: 'cartao',
            foreignField: '_id',
            as: 'cartao'
          }
        },
        { $unwind: { path: '$cartao', preserveNullAndEmptyArrays: true } },
        { $sort: { data: -1 } }
      ]);
      
      // Remover campo temporário
      extratos = extratos.map(extrato => {
        const { gastoRef, ...rest } = extrato;
        return rest;
      });
    } else {
      // Query normal sem filtro de tipoDespesa
      extratos = await Extrato.find(query)
        .populate('contaBancaria', 'nome banco')
        .populate('cartao', 'nome banco tipo')
        .sort({ data: -1 });
    }

    console.log('Extratos encontrados:', extratos.length);

    let totalSaldo = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;
    
    // Calcular totais baseados nos extratos filtrados (incluindo filtro de tipoDespesa)
    totalEntradas = extratos
      .filter(extrato => extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial')
      .reduce((sum, extrato) => sum + extrato.valor, 0);
    
    totalSaidas = extratos
      .filter(extrato => extrato.tipo === 'Saída')
      .reduce((sum, extrato) => sum + extrato.valor, 0);
    
    // Calcular saldo da conta (se houver filtro de conta bancária)
    if (contaBancaria) {
      const saldoAgg = await Extrato.aggregate([
        { 
          $match: { 
            contaBancaria: new mongoose.Types.ObjectId(contaBancaria), 
            usuario: new mongoose.Types.ObjectId(req.user._id), 
            estornado: false 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { 
              $sum: { 
                $cond: { 
                  if: { $in: ['$tipo', ['Entrada','Saldo Inicial']] }, 
                  then: '$valor', 
                  else: { $multiply: ['$valor', -1] } 
                } 
              } 
            } 
          } 
        }
      ]);
      totalSaldo = saldoAgg[0]?.total || 0;
    }

    res.json({ extratos, totalSaldo, totalEntradas, totalSaidas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar extrato' });
  }
});

// @route   POST /api/extrato
// @desc    Criar lançamento manual
// @access  Private
router.post('/', [
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória'),
  body('tipo').isIn(['Entrada', 'Saída']).withMessage('Tipo deve ser Entrada ou Saída'),
  body('valor').isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a zero'),
  body('data').notEmpty().withMessage('Data é obrigatória'),
  body('motivo').notEmpty().withMessage('Motivo é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaBancaria, tipo, valor, data, motivo, cartao } = req.body;

    // Criar data em UTC para evitar problemas de timezone
    const [year, month, day] = data.split('-').map(Number);
    const dataParsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Verificar se conta bancária pertence ao usuário e está ativa
    const conta = await ContaBancaria.findOne({
      _id: contaBancaria,
      usuario: req.user._id,
      ativo: { $ne: false }
    });

    if (!conta) {
      return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
    }

    const extrato = await Extrato.create({
      contaBancaria,
      cartao: cartao || null,
      tipo,
      valor: parseFloat(valor),
      data: dataParsed,
      motivo,
      referencia: {
        tipo: 'Lancamento',
        id: null
      },
      usuario: req.user._id
    });

    res.status(201).json(extrato);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar lançamento' });
  }
});

// @route   POST /api/extrato/saldo-inicial
// @desc    Lançar saldo inicial
// @access  Private
router.post('/saldo-inicial', [
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória'),
  body('valor').isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a zero'),
  body('data').notEmpty().withMessage('Data é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaBancaria, valor, data } = req.body;

    // Verificar se conta bancária existe e está ativa
    const conta = await ContaBancaria.findOne({ _id: contaBancaria, usuario: req.user._id, ativo: { $ne: false } });
    if (!conta) return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });

    // Verificar se já existe saldo inicial
    const saldoInicialExistente = await Extrato.findOne({
      contaBancaria,
      tipo: 'Saldo Inicial',
      usuario: req.user._id,
      estornado: false
    });

    if (saldoInicialExistente) {
      return res.status(400).json({ message: 'Saldo inicial já foi lançado para esta conta' });
    }

    const extrato = await Extrato.create({
      contaBancaria,
      cartao: null, // Saldo inicial não tem cartão
      tipo: 'Saldo Inicial',
      valor: parseFloat(valor),
      data: new Date(data),
      motivo: 'Saldo Inicial',
      referencia: {
        tipo: 'Saldo Inicial',
        id: null
      },
      usuario: req.user._id
    });

    res.status(201).json(extrato);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao lançar saldo inicial' });
  }
});

// @route   POST /api/extrato/:id/estornar
// @desc    Estornar lançamento
// @access  Private
router.post('/:id/estornar', async (req, res) => {
  try {
    // Validar se o ID é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de lançamento inválido' });
    }

    console.log('=== ESTORNO DEBUG ===');
    console.log('req.params.id:', req.params.id);
    console.log('req.user._id:', req.user._id);
    console.log('mongoose.connection.readyState:', mongoose.connection.readyState);

    // Verificar conexão com MongoDB e tentar reconectar se necessário
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB não está conectado, tentando reconectar...');
      
      // Tentar reconectar
      try {
        await mongoose.connection.asPromise();
        console.log('MongoDB reconectado com sucesso');
      } catch (reconnectError) {
        console.error('Falha ao reconectar ao MongoDB:', reconnectError);
        return res.status(503).json({ 
          message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.' 
        });
      }
    }

    // Tentar a operação com retry
    let extrato;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        extrato = await Extrato.findOne({
          _id: req.params.id,
          usuario: req.user._id
        });
        break; // Sucesso, sair do loop
      } catch (dbError) {
        retryCount++;
        console.log(`Tentativa ${retryCount}/${maxRetries} falhou:`, dbError.message);
        
        if (retryCount >= maxRetries) {
          throw dbError;
        }
        
        // Esperar antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    console.log('Extrato encontrado:', extrato);

    if (!extrato) {
      return res.status(404).json({ message: 'Lançamento não encontrado' });
    }

    if (extrato.estornado) {
      return res.status(400).json({ message: 'Lançamento já foi estornado' });
    }

    // Tentar salvar com retry também
    retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        extrato.estornado = true;
        await extrato.save();
        break; // Sucesso, sair do loop
      } catch (saveError) {
        retryCount++;
        console.log(`Tentativa de salvar ${retryCount}/${maxRetries} falhou:`, saveError.message);
        
        if (retryCount >= maxRetries) {
          throw saveError;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    // Se o extrato tiver referência a um gasto, excluir o gasto também
    if (extrato.referencia?.tipo === 'Gasto' && extrato.referencia?.id) {
      try {
        const Gasto = require('../models/Gasto');
        const gasto = await Gasto.findOne({
          _id: extrato.referencia.id,
          usuario: req.user._id
        });

        if (gasto) {
          await gasto.deleteOne();
          console.log('Gasto correspondente excluído com sucesso');
        }
      } catch (gastoError) {
        console.error('Erro ao excluir gasto correspondente:', gastoError);
        // Não falhar a operação principal se não conseguir excluir o gasto
      }
    }

    console.log('Extrato estornado com sucesso');
    res.json({ message: 'Lançamento estornado com sucesso' });
  } catch (error) {
    console.error('Erro ao estornar lançamento:', error);
    
    // Tratamento específico para diferentes tipos de erro
    if (error.name === 'MongooseServerSelectionError' || 
        error.message.includes('Could not connect to any servers')) {
      return res.status(503).json({ 
        message: 'Serviço temporariamente indisponível devido a problemas de conexão. Tente novamente.' 
      });
    }
    
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return res.status(503).json({ message: 'Erro de conexão com banco de dados' });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dados inválidos', error: error.message });
    }
    
    res.status(500).json({ 
      message: 'Erro ao estornar lançamento',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

