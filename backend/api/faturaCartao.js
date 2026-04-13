const express = require('express');
const { body, validationResult } = require('express-validator');
const FaturaCartao = require('../models/FaturaCartao');
const Cartao = require('../models/Cartao');
const Conta = require('../models/Conta');
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/fatura-cartao
// @desc    Obter todas as faturas do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { cartao, status, mesReferencia } = req.query;
    const query = { usuario: req.user._id };

    if (cartao) query.cartao = cartao;
    if (status) query.status = status;
    if (mesReferencia) query.mesReferencia = mesReferencia;

    const faturas = await FaturaCartao.find(query)
      .populate('cartao')
      .populate('despesas.conta')
      .populate('contaBancariaPagamento')
      .sort({ mesReferencia: -1 });

    res.json(faturas);
  } catch (error) {
    logger.error('Erro ao buscar faturas', { error: error.message, userId: req.user._id });
    res.status(500).json({ message: 'Erro ao buscar faturas' });
  }
});

// @route   GET /api/fatura-cartao/:id
// @desc    Obter fatura específica
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const fatura = await FaturaCartao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    })
    .populate('cartao')
    .populate('despesas.conta')
    .populate('contaBancariaPagamento');

    if (!fatura) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }

    res.json(fatura);
  } catch (error) {
    logger.error('Erro ao buscar fatura', { error: error.message, faturaId: req.params.id });
    res.status(500).json({ message: 'Erro ao buscar fatura' });
  }
});

// @route   POST /api/fatura-cartao/pagar-conta
// @desc    Adicionar despesa à fatura do cartão de crédito
// @access  Private
router.post('/pagar-conta', [
  body('contaId').notEmpty().withMessage('ID da conta é obrigatório'),
  body('cartaoId').notEmpty().withMessage('ID do cartão é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaId, cartaoId } = req.body;

    // Buscar a conta que foi paga
    const conta = await Conta.findOne({
      _id: contaId,
      usuario: req.user._id
    }).populate('fornecedor');

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    // Buscar o cartão
    const cartao = await Cartao.findOne({
      _id: cartaoId,
      usuario: req.user._id,
      ativo: true
    });

    if (!cartao) {
      return res.status(404).json({ message: 'Cartão não encontrado ou inativo' });
    }

    // Determinar o mês de referência da fatura
    const dataPagamento = new Date(conta.dataPagamento);
    const mesReferencia = dataPagamento.toISOString().slice(0, 7); // "YYYY-MM"

    // Buscar ou criar fatura do mês
    let fatura = await FaturaCartao.findOne({
      cartao: cartaoId,
      mesReferencia: mesReferencia,
      usuario: req.user._id
    });

    if (!fatura) {
      // Criar nova fatura
      const dataVencimento = new Date(dataPagamento);
      dataVencimento.setMonth(dataVencimento.getMonth() + 1); // Próximo mês
      dataVencimento.setDate(cartao.diaVencimento || 10); // Dia de vencimento do cartão

      const dataFechamento = new Date(dataVencimento);
      dataFechamento.setDate(dataFechamento.getDate() - 5); // 5 dias antes do vencimento

      fatura = new FaturaCartao({
        cartao: cartaoId,
        usuario: req.user._id,
        mesReferencia: mesReferencia,
        dataVencimento: dataVencimento,
        dataFechamento: dataFechamento
      });
    }

    // Adicionar despesa à fatura
    const valorPago = conta.valor + (conta.jurosPago || 0);
    await fatura.adicionarDespesa(
      contaId,
      valorPago,
      conta.dataPagamento,
      `${conta.nome} - ${conta.fornecedor?.nome || 'Fornecedor não informado'}`
    );

    logger.info('Despesa adicionada à fatura de cartão', {
      faturaId: fatura._id,
      contaId: contaId,
      cartaoId: cartaoId,
      valor: valorPago,
      mesReferencia: mesReferencia
    });

    res.json({
      message: 'Despesa adicionada à fatura com sucesso',
      fatura: fatura
    });
  } catch (error) {
    logger.error('Erro ao adicionar despesa à fatura', { error: error.message });
    res.status(500).json({ message: 'Erro ao adicionar despesa à fatura' });
  }
});

// @route   POST /api/fatura-cartao/:id/pagar
// @desc    Pagar fatura do cartão de crédito
// @access  Private
router.post('/:id/pagar', [
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaBancaria } = req.body;

    // Buscar fatura
    const fatura = await FaturaCartao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    }).populate('cartao');

    if (!fatura) {
      return res.status(404).json({ message: 'Fatura não encontrada' });
    }

    if (fatura.status === 'Paga') {
      return res.status(400).json({ message: 'Fatura já está paga' });
    }

    // Verificar se conta bancária existe
    const contaBancariaObj = await ContaBancaria.findOne({
      _id: contaBancaria,
      usuario: req.user._id,
      ativo: { $ne: false }
    });

    if (!contaBancariaObj) {
      return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
    }

    // Usar transação para garantir consistência
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Pagar fatura
      await fatura.pagarFatura(contaBancaria);

      // Criar registro no extrato (agora sim, pois o dinheiro está saindo da conta)
      await Extrato.create([{
        contaBancaria: contaBancaria,
        cartao: fatura.cartao._id,
        tipo: 'Saída',
        valor: fatura.valorTotal,
        data: new Date(),
        motivo: `Pagamento Fatura Cartão ${fatura.cartao.nome} - ${fatura.mesReferencia}`,
        referencia: {
          tipo: 'FaturaCartao',
          id: fatura._id
        },
        usuario: req.user._id
      }], { session });

      await session.commitTransaction();

      logger.info('Fatura de cartão paga com sucesso', {
        faturaId: fatura._id,
        cartaoId: fatura.cartao._id,
        valor: fatura.valorTotal,
        contaBancaria: contaBancaria
      });

      res.json({
        message: 'Fatura paga com sucesso',
        fatura: await FaturaCartao.findById(fatura._id).populate('cartao')
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error('Erro ao pagar fatura', { error: error.message, faturaId: req.params.id });
    res.status(500).json({ message: 'Erro ao pagar fatura' });
  }
});

module.exports = router;
