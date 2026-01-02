const express = require('express');
const { body, validationResult } = require('express-validator');
const Fornecedor = require('../models/Fornecedor');
const Conta = require('../models/Conta');
const auth = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/fornecedores
// @desc    Obter todos os fornecedores do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const fornecedores = await Fornecedor.find({
      usuario: req.user._id
    }).sort({ nome: 1 });

    res.json(fornecedores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar fornecedores' });
  }
});

// @route   GET /api/fornecedores/:id
// @desc    Obter fornecedor específico
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!fornecedor) {
      return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }

    res.json(fornecedor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar fornecedor' });
  }
});

// @route   POST /api/fornecedores
// @desc    Criar novo fornecedor
// @access  Private
router.post('/', [
  body('nome').notEmpty().withMessage('Nome é obrigatório')
  // Tipo não é mais obrigatório
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, tipo } = req.body;

    const fornecedor = await Fornecedor.create({
      nome,
      tipo: tipo || 'Geral', // Tipo padrão se não informado
      usuario: req.user._id
    });

    res.status(201).json(fornecedor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar fornecedor' });
  }
});

// @route   PUT /api/fornecedores/:id
// @desc    Atualizar fornecedor
// @access  Private
router.put('/:id', [
  body('nome').optional().notEmpty().withMessage('Nome não pode ser vazio')
  // Tipo não é mais obrigatório para atualização
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const fornecedor = await Fornecedor.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!fornecedor) {
      return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }

    const { nome, tipo } = req.body;
    
    // Atualizar apenas os campos fornecidos
    if (nome) fornecedor.nome = nome;
    if (tipo) fornecedor.tipo = tipo;
    // Se tipo não for informado, mantém o valor atual
    
    await fornecedor.save();

    res.json(fornecedor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar fornecedor' });
  }
});

// @route   PUT /api/fornecedores/:id/inativar
// @desc    Inativar fornecedor
// @access  Private
router.put('/:id/inativar', async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!fornecedor) {
      return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }

    // Verificar se há contas vinculadas
    const contasVinculadas = await Conta.countDocuments({
      fornecedor: fornecedor._id,
      usuario: req.user._id,
      status: { $in: ['Pendente', 'Vencida'] }
    });

    if (contasVinculadas > 0) {
      return res.status(400).json({
        message: 'Não é possível inativar fornecedor com contas pendentes ou vencidas'
      });
    }

    fornecedor.ativo = false;
    await fornecedor.save();

    res.json({ message: 'Fornecedor inativado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao inativar fornecedor' });
  }
});

module.exports = router;

