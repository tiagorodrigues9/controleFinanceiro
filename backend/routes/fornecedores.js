const express = require('express');
const { body, validationResult } = require('express-validator');
const Fornecedor = require('../models/Fornecedor');
const Conta = require('../models/Conta');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { logger } = require('../utils/logger');

const router = express.Router();

router.param('id', validateObjectId);

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
    logger.error(error);
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
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar fornecedor' });
  }
});

// @route   POST /api/fornecedores
// @desc    Criar novo fornecedor
// @access  Private
router.post('/', [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('E-mail inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, tipo, documento, telefone, email, endereco, observacoes } = req.body;

    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Verificar se já existe um fornecedor com este nome para este usuário
    const existingFornecedor = await Fornecedor.findOne({
      usuario: req.user._id,
      nome: { $regex: new RegExp(`^${escapeRegExp(nome)}$`, 'i') } // case-insensitive exact match
    });

    if (existingFornecedor) {
      return res.status(400).json({ message: 'Você já possui um fornecedor cadastrado com este nome.' });
    }

    const fornecedor = await Fornecedor.create({
      nome,
      tipo: tipo || 'Geral',
      documento,
      telefone,
      email,
      endereco,
      observacoes,
      usuario: req.user._id
    });

    res.status(201).json(fornecedor);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao criar fornecedor' });
  }
});

// @route   PUT /api/fornecedores/:id
// @desc    Atualizar fornecedor
// @access  Private
router.put('/:id', [
  body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('E-mail inválido')
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

    const { nome, tipo, documento, telefone, email, endereco, observacoes, ativo } = req.body;
    
    // Se o nome foi alterado, verificar duplicidade
    if (nome && nome.toLowerCase() !== fornecedor.nome.toLowerCase()) {
      const escapeRegExp = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      const existingFornecedor = await Fornecedor.findOne({
        usuario: req.user._id,
        nome: { $regex: new RegExp(`^${escapeRegExp(nome)}$`, 'i') }
      });

      if (existingFornecedor) {
        return res.status(400).json({ message: 'Você já possui outro fornecedor cadastrado com este nome.' });
      }
    }
    
    if (nome !== undefined) fornecedor.nome = nome;
    if (tipo !== undefined) fornecedor.tipo = tipo;
    if (documento !== undefined) fornecedor.documento = documento;
    if (telefone !== undefined) fornecedor.telefone = telefone;
    if (email !== undefined) fornecedor.email = email;
    if (endereco !== undefined) fornecedor.endereco = endereco;
    if (observacoes !== undefined) fornecedor.observacoes = observacoes;
    if (ativo !== undefined) fornecedor.ativo = ativo; // Permite reativar ou inativar via PUT
    
    await fornecedor.save();

    res.json(fornecedor);
  } catch (error) {
    logger.error(error);
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
    logger.error(error);
    res.status(500).json({ message: 'Erro ao inativar fornecedor' });
  }
});

// @route   PUT /api/fornecedores/:id/ativar
// @desc    Ativar (Reativar) fornecedor
// @access  Private
router.put('/:id/ativar', async (req, res) => {
  try {
    const fornecedor = await Fornecedor.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!fornecedor) {
      return res.status(404).json({ message: 'Fornecedor não encontrado' });
    }

    fornecedor.ativo = true;
    await fornecedor.save();

    res.json({ message: 'Fornecedor reativado com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao reativar fornecedor' });
  }
});

module.exports = router;
