const express = require('express');
const { body, validationResult } = require('express-validator');
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const auth = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/contas-bancarias
// @desc    Obter todas as contas bancárias do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    // por padrão retorna apenas contas ativas; para listar todas use ?all=true
    const filter = { usuario: req.user._id };
    if (req.query.all !== 'true') {
      filter.ativo = { $ne: false };
    }

    const contasBancarias = await ContaBancaria.find(filter).sort({ nome: 1 });

    // Calcular saldo para cada conta
    const contasComSaldo = await Promise.all(
      contasBancarias.map(async (conta) => {
        const extratos = await Extrato.find({
          contaBancaria: conta._id,
          usuario: req.user._id,
          estornado: false
        });

        const saldo = extratos.reduce((acc, extrato) => {
          if (extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial') {
            return acc + extrato.valor;
          } else {
            return acc - extrato.valor;
          }
        }, 0);

        return {
          ...conta.toObject(),
          saldo
        };
      })
    );

    res.json(contasComSaldo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar contas bancárias' });
  }
});

// @route   GET /api/contas-bancarias/:id
// @desc    Obter conta bancária específica
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const contaBancaria = await ContaBancaria.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!contaBancaria) {
      return res.status(404).json({ message: 'Conta bancária não encontrada' });
    }

    // Calcular saldo
    const extratos = await Extrato.find({
      contaBancaria: contaBancaria._id,
      usuario: req.user._id,
      estornado: false
    });

    const saldo = extratos.reduce((acc, extrato) => {
      if (extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial') {
        return acc + extrato.valor;
      } else {
        return acc - extrato.valor;
      }
    }, 0);

    res.json({
      ...contaBancaria.toObject(),
      saldo
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar conta bancária' });
  }
});

// @route   POST /api/contas-bancarias
// @desc    Criar nova conta bancária
// @access  Private
router.post('/', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('banco').notEmpty().withMessage('Banco é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, banco, numeroConta, agencia } = req.body;

    const contaBancaria = await ContaBancaria.create({
      nome,
      banco,
      numeroConta,
      agencia,
      usuario: req.user._id
    });

    res.status(201).json(contaBancaria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar conta bancária' });
  }
});

// @route   PUT /api/contas-bancarias/:id
// @desc    Atualizar conta bancária
// @access  Private
router.put('/:id', [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('banco').notEmpty().withMessage('Banco é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const contaBancaria = await ContaBancaria.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!contaBancaria) {
      return res.status(404).json({ message: 'Conta bancária não encontrada' });
    }

    const { nome, banco, numeroConta, agencia } = req.body;
    contaBancaria.nome = nome;
    contaBancaria.banco = banco;
    if (numeroConta !== undefined) contaBancaria.numeroConta = numeroConta;
    if (agencia !== undefined) contaBancaria.agencia = agencia;

    await contaBancaria.save();

    res.json(contaBancaria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar conta bancária' });
  }
});

// @route   DELETE /api/contas-bancarias/:id
// @desc    Excluir conta bancária
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const contaBancaria = await ContaBancaria.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!contaBancaria) {
      return res.status(404).json({ message: 'Conta bancária não encontrada' });
    }

    // marcar como inativa em vez de excluir fisicamente
    contaBancaria.ativo = false;
    await contaBancaria.save();

    res.json({ message: 'Conta bancária inativada com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir conta bancária' });
  }
});

module.exports = router;

