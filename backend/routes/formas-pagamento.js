const express = require('express');
const { body, validationResult } = require('express-validator');
const FormaPagamento = require('../models/FormaPagamento');
const auth = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/formas-pagamento
// @desc    Obter todas as formas de pagamento do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const formas = await FormaPagamento.find({
      usuario: req.user._id,
      ativo: true
    }).sort({ nome: 1 });
    res.json(formas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar formas de pagamento' });
  }
});

// @route   POST /api/formas-pagamento
// @desc    Criar nova forma de pagamento
// @access  Private
router.post('/', [
  body('nome').notEmpty().withMessage('Nome é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome } = req.body;

    const forma = await FormaPagamento.create({
      nome,
      usuario: req.user._id
    });

    res.status(201).json(forma);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar forma de pagamento' });
  }
});

// @route   PUT /api/formas-pagamento/:id
// @desc    Atualizar forma de pagamento
// @access  Private
router.put('/:id', [
  body('nome').notEmpty().withMessage('Nome é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome } = req.body;

    const forma = await FormaPagamento.findOneAndUpdate(
      { _id: req.params.id, usuario: req.user._id },
      { nome },
      { new: true }
    );

    if (!forma) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
    }

    res.json(forma);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar forma de pagamento' });
  }
});

// @route   DELETE /api/formas-pagamento/:id
// @desc    Deletar forma de pagamento
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const forma = await FormaPagamento.findOneAndUpdate(
      { _id: req.params.id, usuario: req.user._id },
      { ativo: false },
      { new: true }
    );

    if (!forma) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
    }

    res.json({ message: 'Forma de pagamento removida' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao remover forma de pagamento' });
  }
});

module.exports = router;