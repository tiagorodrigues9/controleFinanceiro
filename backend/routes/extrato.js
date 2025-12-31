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

    let extratos = await Extrato.find(query)
      .populate('contaBancaria')
      .populate('cartao')
      .populate({ path: 'referencia.id', model: 'Gasto' })
      .sort({ data: -1 });

    // Se filtro por tipo de despesa, filtrar gastos
    if (tipoDespesa) {
      extratos = extratos.filter(extrato => {
        if (extrato.referencia?.tipo === 'Gasto' && extrato.referencia?.id) {
          const gasto = extrato.referencia.id;
          return gasto.tipoDespesa?.grupo?.toString() === tipoDespesa;
        }
        return false;
      });
    }

    let totalSaldo = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;
    
    if (contaBancaria) {
      const saldoAgg = await Extrato.aggregate([
        { $match: { contaBancaria: new mongoose.Types.ObjectId(contaBancaria), usuario: req.user._id, estornado: false } },
        { $group: { _id: null, total: { $sum: { $cond: { if: { $in: ['$tipo', ['Entrada','Saldo Inicial']] }, then: '$valor', else: { $multiply: ['$valor', -1] } } } } } }
      ]);
      totalSaldo = saldoAgg[0]?.total || 0;
    }

    // Calcular totais do período filtrado
    const matchQuery = { usuario: req.user._id, estornado: false };
    if (contaBancaria) {
      matchQuery.contaBancaria = new mongoose.Types.ObjectId(contaBancaria);
    }
    if (cartao) {
      matchQuery.cartao = new mongoose.Types.ObjectId(cartao);
    }
    if (dataInicio && dataFim) {
      const [inicioYear, inicioMonth, inicioDay] = dataInicio.split('-').map(Number);
      const [fimYear, fimMonth, fimDay] = dataFim.split('-').map(Number);
      matchQuery.data = {
        $gte: new Date(Date.UTC(inicioYear, inicioMonth - 1, inicioDay, 0, 0, 0)),
        $lte: new Date(Date.UTC(fimYear, fimMonth - 1, fimDay, 23, 59, 59))
      };
    }

    const totaisAgg = await Extrato.aggregate([
      { $match: matchQuery },
      { 
        $group: { 
          _id: null,
          totalEntradas: { $sum: { $cond: { if: { $in: ['$tipo', ['Entrada','Saldo Inicial']] }, then: '$valor', else: 0 } } },
          totalSaidas: { $sum: { $cond: { if: { $eq: ['$tipo', 'Saída'] }, then: '$valor', else: 0 } } }
        } 
      }
    ]);

    if (totaisAgg.length > 0) {
      totalEntradas = totaisAgg[0].totalEntradas || 0;
      totalSaidas = totaisAgg[0].totalSaidas || 0;
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
    const extrato = await Extrato.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!extrato) {
      return res.status(404).json({ message: 'Lançamento não encontrado' });
    }

    if (extrato.estornado) {
      return res.status(400).json({ message: 'Lançamento já foi estornado' });
    }

    extrato.estornado = true;
    await extrato.save();

    res.json({ message: 'Lançamento estornado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao estornar lançamento' });
  }
});

module.exports = router;

