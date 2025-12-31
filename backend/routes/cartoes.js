const express = require('express');
const { body, validationResult } = require('express-validator');
const Cartao = require('../models/Cartao');
const auth = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/cartoes
// @desc    Obter todos os cartões do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const cartoes = await Cartao.find({ usuario: req.user._id })
      .sort({ createdAt: -1 });
    res.json(cartoes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar cartões' });
  }
});

// @route   POST /api/cartoes
// @desc    Criar novo cartão
// @access  Private
router.post('/', [
  body('nome').notEmpty().withMessage('Nome do cartão é obrigatório'),
  body('tipo').isIn(['Crédito', 'Débito']).withMessage('Tipo deve ser Crédito ou Débito'),
  body('banco').notEmpty().withMessage('Banco é obrigatório'),
  body('limite').optional().isFloat({ min: 0 }).withMessage('Limite deve ser maior ou igual a zero'),
  body('diaFatura').optional().isInt({ min: 1, max: 31 }).withMessage('Dia da fatura deve ser entre 1 e 31'),
  body('dataVencimento').optional().isISO8601().withMessage('Data de vencimento deve ser uma data válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Erros de validação:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, tipo, banco, limite, diaFatura, dataVencimento } = req.body;
    
    console.log('Dados recebidos:', { nome, tipo, banco, limite, diaFatura, dataVencimento });

    // Verificar se já existe cartão com mesmo nome para este usuário
    const cartaoExistente = await Cartao.findOne({ 
      nome: nome.trim(), 
      usuario: req.user._id 
    });

    if (cartaoExistente) {
      return res.status(400).json({ message: 'Já existe um cartão com este nome' });
    }

    const cartao = await Cartao.create({
      nome: nome.trim(),
      tipo,
      banco: banco.trim(),
      limite: tipo === 'Crédito' && limite ? parseFloat(limite) : undefined,
      diaFatura: tipo === 'Crédito' && diaFatura ? parseInt(diaFatura) : undefined,
      dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
      usuario: req.user._id
    });

    console.log('Cartão criado:', cartao);
    res.status(201).json(cartao);
  } catch (error) {
    console.error('Erro ao criar cartão:', error);
    res.status(500).json({ message: 'Erro ao criar cartão', error: error.message });
  }
});

// @route   PUT /api/cartoes/:id
// @desc    Atualizar cartão
// @access  Private
router.put('/:id', [
  body('nome').optional().notEmpty().withMessage('Nome do cartão não pode ser vazio'),
  body('tipo').optional().isIn(['Crédito', 'Débito']).withMessage('Tipo deve ser Crédito ou Débito'),
  body('banco').optional().notEmpty().withMessage('Banco não pode ser vazio'),
  body('limite').optional().isFloat({ min: 0 }).withMessage('Limite deve ser maior ou igual a zero'),
  body('diaFatura').optional().isInt({ min: 1, max: 31 }).withMessage('Dia da fatura deve ser entre 1 e 31'),
  body('dataVencimento').optional().isISO8601().withMessage('Data de vencimento deve ser uma data válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const cartao = await Cartao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!cartao) {
      return res.status(404).json({ message: 'Cartão não encontrado' });
    }

    const { nome, tipo, banco, limite, diaFatura, dataVencimento } = req.body;

    // Se mudou o nome, verificar se já existe outro cartão com este nome
    if (nome && nome.trim() !== cartao.nome) {
      const cartaoExistente = await Cartao.findOne({ 
        nome: nome.trim(), 
        usuario: req.user._id,
        _id: { $ne: req.params.id }
      });

      if (cartaoExistente) {
        return res.status(400).json({ message: 'Já existe um cartão com este nome' });
      }
    }

    // Atualizar campos
    if (nome) cartao.nome = nome.trim();
    if (tipo) cartao.tipo = tipo;
    if (banco) cartao.banco = banco.trim();
    if (limite !== undefined) cartao.limite = parseFloat(limite);
    if (diaFatura !== undefined) cartao.diaFatura = parseInt(diaFatura);
    if (dataVencimento !== undefined) cartao.dataVencimento = new Date(dataVencimento);

    // Se mudou para Débito, limpar campos específicos de crédito
    if (cartao.tipo === 'Débito') {
      cartao.limite = undefined;
      cartao.diaFatura = undefined;
      // Mantém dataVencimento para cartões de débito
    }

    await cartao.save();
    res.json(cartao);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar cartão' });
  }
});

// @route   PUT /api/cartoes/:id/inativar
// @desc    Inativar/Ativar cartão
// @access  Private
router.put('/:id/inativar', async (req, res) => {
  try {
    const cartao = await Cartao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!cartao) {
      return res.status(404).json({ message: 'Cartão não encontrado' });
    }

    cartao.ativo = !cartao.ativo;
    await cartao.save();

    res.json({ 
      message: `Cartão ${cartao.ativo ? 'ativado' : 'inativado'} com sucesso`,
      cartao 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao alterar status do cartão' });
  }
});

// @route   DELETE /api/cartoes/:id
// @desc    Excluir cartão
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const cartao = await Cartao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!cartao) {
      return res.status(404).json({ message: 'Cartão não encontrado' });
    }

    await Cartao.deleteOne({ _id: req.params.id });
    res.json({ message: 'Cartão excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir cartão' });
  }
});

// @route   GET /api/cartoes/relatorio-gastos
// @desc    Relatório de gastos por cartão no mês
// @access  Private
router.get('/relatorio-gastos', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

    const startDate = new Date(anoAtual, mesAtual - 1, 1);
    const endDate = new Date(anoAtual, mesAtual, 0, 23, 59, 59);

    // Buscar todos os cartões ativos do usuário
    const cartoes = await Cartao.find({ 
      usuario: req.user._id, 
      ativo: true 
    });

    // Buscar gastos do período
    const Gasto = require('../models/Gasto');
    const gastos = await Gasto.find({
      usuario: req.user._id,
      data: { $gte: startDate, $lte: endDate },
      formaPagamento: { $in: ['Cartão de Crédito', 'Cartão de Débito'] }
    });

    // Agrupar gastos por cartão (simulação - precisaria de campo cartaoId no Gasto)
    const relatorio = cartoes.map(cartao => {
      // Por enquanto, vamos simular com base no tipo de cartão
      const gastosCartao = gastos.filter(gasto => 
        (cartao.tipo === 'Crédito' && gasto.formaPagamento === 'Cartão de Crédito') ||
        (cartao.tipo === 'Débito' && gasto.formaPagamento === 'Cartão de Débito')
      );

      const totalGastos = gastosCartao.reduce((acc, gasto) => acc + gasto.valor, 0);
      const limiteUtilizado = cartao.tipo === 'Crédito' ? 
        (totalGastos / cartao.limite) * 100 : 0;

      return {
        cartaoId: cartao._id,
        nome: cartao.nome,
        tipo: cartao.tipo,
        banco: cartao.banco,
        limite: cartao.limite,
        totalGastos,
        quantidadeTransacoes: gastosCartao.length,
        limiteUtilizado: cartao.tipo === 'Crédito' ? limiteUtilizado.toFixed(2) : null,
        disponivel: cartao.tipo === 'Crédito' ? cartao.limite - totalGastos : null
      };
    });

    res.json(relatorio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao gerar relatório de gastos' });
  }
});

module.exports = router;
