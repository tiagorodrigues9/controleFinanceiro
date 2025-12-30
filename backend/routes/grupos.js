const express = require('express');
const { body, validationResult } = require('express-validator');
const Grupo = require('../models/Grupo');
const auth = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/grupos
// @desc    Obter todos os grupos do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const grupos = await Grupo.find({
      usuario: req.user._id
    }).sort({ nome: 1 });

    res.json(grupos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar grupos' });
  }
});

// @route   GET /api/grupos/:id
// @desc    Obter grupo específico
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const grupo = await Grupo.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    res.json(grupo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar grupo' });
  }
});

// @route   POST /api/grupos
// @desc    Criar novo grupo
// @access  Private
router.post('/', [
  body('nome').notEmpty().withMessage('Nome é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, subgrupos } = req.body;

    const grupo = await Grupo.create({
      nome,
      subgrupos: subgrupos || [],
      usuario: req.user._id
    });

    res.status(201).json(grupo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar grupo' });
  }
});

// @route   PUT /api/grupos/:id
// @desc    Atualizar grupo
// @access  Private
router.put('/:id', [
  body('nome').notEmpty().withMessage('Nome é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const grupo = await Grupo.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const { nome, subgrupos } = req.body;
    grupo.nome = nome;
    if (subgrupos !== undefined) grupo.subgrupos = subgrupos;

    await grupo.save();

    res.json(grupo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar grupo' });
  }
});

// @route   POST /api/grupos/:id/subgrupos
// @desc    Adicionar subgrupo
// @access  Private
router.post('/:id/subgrupos', [
  body('nome').notEmpty().withMessage('Nome do subgrupo é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const grupo = await Grupo.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    grupo.subgrupos.push({ nome: req.body.nome });
    await grupo.save();

    res.json(grupo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao adicionar subgrupo' });
  }
});

// @route   DELETE /api/grupos/:id
// @desc    Excluir grupo
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const grupo = await Grupo.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    await grupo.deleteOne();

    res.json({ message: 'Grupo excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir grupo' });
  }
});

// @route   DELETE /api/grupos/:id/subgrupos/:subId
// @desc    Excluir subgrupo de um grupo
// @access  Private
router.delete('/:id/subgrupos/:subId', async (req, res) => {
  try {
    const grupo = await Grupo.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    const sub = grupo.subgrupos.id(req.params.subId);
    if (!sub) {
      return res.status(404).json({ message: 'Subgrupo não encontrado' });
    }

    sub.remove();
    await grupo.save();

    res.json({ message: 'Subgrupo excluído com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir subgrupo' });
  }
});

module.exports = router;

