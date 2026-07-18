const express = require('express');
const { body, validationResult } = require('express-validator');
const FaturaCartao = require('../models/FaturaCartao');
const Cartao = require('../models/Cartao');
const Conta = require('../models/Conta');
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const Gasto = require('../models/Gasto');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { calcularDatasFatura, buscarOuCriarFaturaAberta, obterPeriodoFatura } = require('../utils/faturaUtils');

const router = express.Router();

router.use(auth);

// @route   GET /api/fatura-cartao
// @desc    Obter todas as faturas do usuário unindo Contas Pagas + Gastos Diários
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

    // Enriquecer dinamicamente cada fatura com os Gastos Diários (Motor Dinâmico Live)
    const faturasEnriquecidas = await Promise.all(faturas.map(async (fatura) => {
      // Se não houver data de fechamento gerada, o sistema não calcula (prevenção de lixo de base)
      if (!fatura.dataFechamento) return fatura.toObject();

      const { start, end } = obterPeriodoFatura(fatura.dataFechamento);

      // Buscar todos os gastos do dia a dia daquele cartão naquele mês específico
      const gastosCartao = await Gasto.find({
        usuario: req.user._id,
        cartao: fatura.cartao._id,
        data: { $gt: start, $lte: end }
      });

      // Mapear os gastos do model Gasto para um formato que a tela Fatura entenda
      const despesasDeGastos = gastosCartao.map(g => ({
        _id: g._id,
        descricao: g.observacao || g.local || 'Gasto no Cartão',
        valor: g.valor,
        data: g.data,
        isGastoDiario: true
      }));

      // Unir as Contas a Pagar velhas com os Novos Gastos
      const todasDespesas = [
        ...fatura.despesas.map(d => ({ ...d.toObject(), isGastoDiario: false })),
        ...despesasDeGastos
      ].sort((a, b) => new Date(b.data) - new Date(a.data));

      const valorTotalReal = todasDespesas.reduce((acc, curr) => acc + curr.valor, 0);

      let statusReal = fatura.status;
      // Trigger Inteligente: Se for Aberta mas a data de fechamento já bateu, forçar Fechamento
      if (statusReal === 'Aberta' && new Date(fatura.dataFechamento) <= new Date()) {
        fatura.status = 'Fechada';
        await fatura.save();
        statusReal = 'Fechada';
      }

      return {
        ...fatura.toObject(),
        status: statusReal,
        valorTotal: valorTotalReal, // O valor é sobreposto vivo
        despesas: todasDespesas, // Sobrescreve as despesas antigas para a lista unificada
      };
    }));

    res.json(faturasEnriquecidas);
  } catch (error) {
    logger.error('Erro ao buscar faturas', { error: error.message, userId: req.user._id });
    res.status(500).json({ message: 'Erro ao buscar faturas' });
  }
});

// @route   POST /api/fatura-cartao/pagar-conta
// @desc    Adicionar despesa à fatura do cartão de crédito através de uma "Conta a Pagar"
// @access  Private
router.post('/pagar-conta', [
  body('contaId').notEmpty().withMessage('ID da conta é obrigatório').isMongoId().withMessage('ID da conta inválido'),
  body('cartaoId').notEmpty().withMessage('ID do cartão é obrigatório').isMongoId().withMessage('ID do cartão inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaId, cartaoId } = req.body;

    const conta = await Conta.findOne({
      _id: contaId,
      usuario: req.user._id
    }).populate('fornecedor');

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    const cartao = await Cartao.findOne({
      _id: cartaoId,
      usuario: req.user._id,
      ativo: true
    });

    if (!cartao) {
      return res.status(404).json({ message: 'Cartão não encontrado ou inativo' });
    }

    // A busca pela fatura aberta agora utiliza os utils corrigidos com saltos corretos
    let fatura = await buscarOuCriarFaturaAberta(
      cartao, 
      req.user._id, 
      conta.dataPagamento || new Date()
    );

    const valorPago = conta.valor + (conta.jurosPago || 0);
    await fatura.adicionarDespesa(
      contaId,
      valorPago,
      conta.dataPagamento,
      `${conta.nome} - ${conta.fornecedor?.nome || 'Fornecedor'}`
    );

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
// @desc    Pagar fatura do cartão de crédito (abatendo saldo)
// @access  Private
router.post('/:id/pagar', [
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória').isMongoId().withMessage('ID da conta bancária inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaBancaria } = req.body;

    const fatura = await FaturaCartao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    }).populate('cartao');

    if (!fatura) return res.status(404).json({ message: 'Fatura não encontrada' });
    if (fatura.status === 'Paga') return res.status(400).json({ message: 'Fatura já está paga' });

    const contaBancariaObj = await ContaBancaria.findOne({
      _id: contaBancaria,
      usuario: req.user._id,
      ativo: { $ne: false }
    });

    if (!contaBancariaObj) return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });

    // Precisamos recalcular o valor exato no backend igual ao GET para cobrar o usuário
    const { start, end } = obterPeriodoFatura(fatura.dataFechamento);
    const gastosCartao = await Gasto.find({
      usuario: req.user._id, cartao: fatura.cartao._id, data: { $gt: start, $lte: end }
    });
    
    const valorGastos = gastosCartao.reduce((acc, g) => acc + g.valor, 0);
    const valorOriginalFatura = fatura.valorTotal || 0;
    const valorTotalParaCobrar = valorGastos + valorOriginalFatura;

    if (valorTotalParaCobrar <= 0) {
      return res.status(400).json({ message: 'Fatura zerada. Não há o que pagar.' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Marcar fatura como paga usando o valor integral
      fatura.valorTotal = valorTotalParaCobrar; // Salva o total cravado ao fechar
      await fatura.pagarFatura(contaBancaria);

      // 2. Abater dinheiro real do caixa da conta (Hotfix crítico!)
      await ContaBancaria.findByIdAndUpdate(contaBancaria, {
        $inc: { saldo: -valorTotalParaCobrar }
      }, { session });

      // 3. Criar a papeleta do Extrato
      await Extrato.create([{
        contaBancaria: contaBancaria,
        cartao: fatura.cartao._id,
        tipo: 'Saída',
        valor: valorTotalParaCobrar,
        data: new Date(),
        motivo: `Pagamento Fatura ${fatura.cartao.nome} (${fatura.mesReferencia})`,
        referencia: { tipo: 'FaturaCartao', id: fatura._id },
        usuario: req.user._id
      }], { session });

      await session.commitTransaction();

      res.json({ message: 'Fatura paga com sucesso e saldo debitado' });
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

// @route   POST /api/fatura-cartao/:id/estornar
// @desc    Estornar o pagamento de uma fatura de cartão e devolver o saldo
// @access  Private
router.post('/:id/estornar', async (req, res) => {
  try {
    const fatura = await FaturaCartao.findOne({ _id: req.params.id, usuario: req.user._id });
    if (!fatura) return res.status(404).json({ message: 'Fatura não encontrada' });
    if (fatura.status !== 'Paga') return res.status(400).json({ message: 'A fatura não está paga.' });

    const extratoRelacionado = await Extrato.findOne({
      'referencia.tipo': 'FaturaCartao',
      'referencia.id': fatura._id,
      usuario: req.user._id
    });

    if (!extratoRelacionado) return res.status(400).json({ message: 'Extrato de pagamento original não encontrado para estorno.' });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Devolver dinheiro real à Conta
      await ContaBancaria.findByIdAndUpdate(extratoRelacionado.contaBancaria, {
        $inc: { saldo: extratoRelacionado.valor } 
      }, { session });

      // 2. Apagar o Recibo
      await Extrato.deleteOne({ _id: extratoRelacionado._id }, { session });

      // 3. Voltar a Fatura para Fechada (pois já deve ter passado do fechamento) ou Aberta.
      fatura.status = new Date(fatura.dataFechamento) <= new Date() ? 'Fechada' : 'Aberta';
      fatura.valorPago = 0;
      fatura.dataPagamento = undefined;
      fatura.contaBancariaPagamento = undefined;
      await fatura.save({ session });

      await session.commitTransaction();

      res.json({ message: 'Pagamento da fatura estornado com sucesso!' });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error('Erro ao estornar fatura', { error: error.message, faturaId: req.params.id });
    res.status(500).json({ message: 'Erro ao estornar fatura' });
  }
});

module.exports = router;
