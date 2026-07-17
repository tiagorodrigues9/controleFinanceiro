const express = require('express');
const { body, validationResult } = require('express-validator');
const Grupo = require('../models/Grupo');
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { logger } = require('../utils/logger');

const router = express.Router();

// Helper para escapar Regex
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/grupos
// @desc    Obter todos os grupos do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const grupos = await Grupo.find({
      usuario: req.user._id
    }).sort({ createdAt: 1 });

    res.json(grupos);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar grupos' });
  }
});

// @route   GET /api/grupos/:id
// @desc    Obter grupo específico
// @access  Private
router.get('/:id', validateObjectId, async (req, res) => {
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
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar grupo' });
  }
});

// @route   POST /api/grupos
// @desc    Criar novo grupo
// @access  Private
router.post('/', [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, subgrupos, cor, icone } = req.body;

    // Verificar se já existe um grupo com este nome para este usuário
    const existingGrupo = await Grupo.findOne({
      usuario: req.user._id,
      nome: { $regex: new RegExp(`^${escapeRegExp(nome)}$`, 'i') }
    });

    if (existingGrupo) {
      return res.status(400).json({ message: 'Você já possui uma categoria cadastrada com este nome.' });
    }

    const grupo = await Grupo.create({
      nome,
      cor: cor || '#6366f1',
      icone: icone || 'Folder',
      subgrupos: subgrupos || [],
      usuario: req.user._id
    });

    res.status(201).json(grupo);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao criar grupo' });
  }
});

// @route   PUT /api/grupos/:id/editar
// @desc    Editar grupo (nome, cor, ícone)
// @access  Private
router.put('/:id/editar', validateObjectId, [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório')
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

    const { nome, cor, icone } = req.body;
    
    // Verificar duplicidade de nome
    if (nome.toLowerCase() !== grupo.nome.toLowerCase()) {
      const existingGrupo = await Grupo.findOne({
        usuario: req.user._id,
        nome: { $regex: new RegExp(`^${escapeRegExp(nome)}$`, 'i') }
      });

      if (existingGrupo) {
        return res.status(400).json({ message: 'Você já possui outra categoria cadastrada com este nome.' });
      }
    }

    grupo.nome = nome;
    if (cor !== undefined) grupo.cor = cor;
    if (icone !== undefined) grupo.icone = icone;
    await grupo.save();

    res.json(grupo);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao editar grupo' });
  }
});

// @route   POST /api/grupos/:id/subgrupos
// @desc    Adicionar subgrupo
// @access  Private
router.post('/:id/subgrupos', validateObjectId, [
  body('nome').trim().notEmpty().withMessage('Nome do subgrupo é obrigatório')
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

    const nomeSubgrupo = req.body.nome;

    // Verificar se já existe um subgrupo com este nome
    const subExists = grupo.subgrupos.some(sub => sub.nome.toLowerCase() === nomeSubgrupo.toLowerCase());
    if (subExists) {
      return res.status(400).json({ message: 'Esta subcategoria já existe neste grupo.' });
    }

    grupo.subgrupos.push({ nome: nomeSubgrupo });
    await grupo.save();

    res.json(grupo);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao adicionar subgrupo' });
  }
});

// @route   PUT /api/grupos/:id/subgrupos/:subId/renomear
// @desc    Renomear subgrupo e atualizar em cascata nas contas/gastos
// @access  Private
router.put('/:id/subgrupos/:subId/renomear', validateObjectId, [
  body('nome').trim().notEmpty().withMessage('Nome do subgrupo é obrigatório')
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

    const sub = grupo.subgrupos.id(req.params.subId);
    if (!sub) {
      return res.status(404).json({ message: 'Subgrupo não encontrado' });
    }

    const novoNome = req.body.nome;
    const nomeAntigo = sub.nome;

    // Verificar duplicidade no mesmo grupo
    if (novoNome.toLowerCase() !== nomeAntigo.toLowerCase()) {
      const subExists = grupo.subgrupos.some(s => s.nome.toLowerCase() === novoNome.toLowerCase() && s._id.toString() !== req.params.subId);
      if (subExists) {
        return res.status(400).json({ message: 'Você já possui outra subcategoria com este nome neste grupo.' });
      }
    }

    sub.nome = novoNome;
    await grupo.save();

    // Atualização em cascata nas despesas (Gastos e Contas)
    // Como os models Gasto e Conta referenciam tipoDespesa.subgrupo como String, precisamos atualizar todos.
    if (novoNome !== nomeAntigo) {
      await Gasto.updateMany(
        { usuario: req.user._id, 'tipoDespesa.grupo': grupo._id, 'tipoDespesa.subgrupo': nomeAntigo },
        { $set: { 'tipoDespesa.subgrupo': novoNome } }
      );
      
      await Conta.updateMany(
        { usuario: req.user._id, 'tipoDespesa.grupo': grupo._id, 'tipoDespesa.subgrupo': nomeAntigo },
        { $set: { 'tipoDespesa.subgrupo': novoNome } }
      );
    }

    res.json(grupo);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao renomear subgrupo' });
  }
});


// @route   DELETE /api/grupos/:id
// @desc    Excluir grupo
// @access  Private
router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const grupo = await Grupo.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!grupo) {
      return res.status(404).json({ message: 'Grupo não encontrado' });
    }

    // Verificar se existe Conta ou Gasto usando este grupo
    const gastosAtrelados = await Gasto.exists({ usuario: req.user._id, 'tipoDespesa.grupo': grupo._id });
    const contasAtreladas = await Conta.exists({ usuario: req.user._id, 'tipoDespesa.grupo': grupo._id });

    if (gastosAtrelados || contasAtreladas) {
      return res.status(400).json({ message: 'Não é possível excluir esta categoria pois existem receitas/despesas vinculadas a ela.' });
    }

    await grupo.deleteOne();

    res.json({ message: 'Grupo excluído com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir grupo' });
  }
});

// @route   DELETE /api/grupos/:id/subgrupos/:subId
// @desc    Excluir subgrupo de um grupo
// @access  Private
router.delete('/:id/subgrupos/:subId', validateObjectId, async (req, res) => {
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

    // Verificar se existe Conta ou Gasto usando este subgrupo (string matching baseada no ID do grupo e string do subgrupo)
    const gastosAtrelados = await Gasto.exists({ 
      usuario: req.user._id, 
      'tipoDespesa.grupo': grupo._id, 
      'tipoDespesa.subgrupo': sub.nome 
    });
    
    const contasAtreladas = await Conta.exists({ 
      usuario: req.user._id, 
      'tipoDespesa.grupo': grupo._id, 
      'tipoDespesa.subgrupo': sub.nome 
    });

    if (gastosAtrelados || contasAtreladas) {
      return res.status(400).json({ message: 'Não é possível excluir esta subcategoria pois existem registros vinculados a ela.' });
    }

    // Remover subgrupo usando pull
    grupo.subgrupos.pull({ _id: req.params.subId });
    await grupo.save();

    res.json({ message: 'Subgrupo excluído com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir subgrupo' });
  }
});

module.exports = router;
