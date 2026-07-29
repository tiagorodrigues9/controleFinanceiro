const express = require('express');
const { body, validationResult } = require('express-validator');
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { logger } = require('../utils/logger');

const router = express.Router();

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};


/**
 * @swagger
 * tags:
 *   name: Contas Bancárias
 *   description: CRUD de contas bancárias
 */
router.param('id', validateObjectId);

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/contas-bancarias
// @desc    Obter todas as contas bancárias do usuário
// @access  Private
/**
 * @swagger
 * /api/contas-bancarias:
 *   get:
 *     summary: Listar todas as contas bancárias
 *     tags: [Contas Bancárias]
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno
 */
router.get('/', async (req, res) => {
  try {
    // por padrão retorna apenas contas ativas; para listar todas use ?all=true
    const filter = { usuario: req.user._id };
    if (req.query.all !== 'true') {
      filter.ativo = { $ne: false };
    }

    const contasBancarias = await ContaBancaria.find(filter).sort({ nome: 1 });

    // Calcular saldo para todas as contas de uma vez via aggregation
    const saldosAgg = await Extrato.aggregate([
      {
        $match: {
          usuario: req.user._id,
          estornado: false,
          contaBancaria: { $in: contasBancarias.map(c => c._id) }
        }
      },
      {
        $group: {
          _id: '$contaBancaria',
          saldo: {
            $sum: {
              $cond: {
                if: { $in: ['$tipo', ['Entrada', 'Saldo Inicial']] },
                then: '$valor',
                else: { $multiply: ['$valor', -1] }
              }
            }
          }
        }
      }
    ]);

    const saldoMap = {};
    saldosAgg.forEach(s => { saldoMap[s._id.toString()] = s.saldo; });

    const contasComSaldo = contasBancarias.map(conta => ({
      ...conta.toObject(),
      saldo: saldoMap[conta._id.toString()] || 0
    }));

    res.json(contasComSaldo);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar contas bancárias' });
  }
});

// @route   GET /api/contas-bancarias:id
// @desc    Obter conta bancária específica
// @access  Private
/**
 * @swagger
 * /api/contas-bancarias/{id}:
 *   get:
 *     summary: Obter conta bancária por ID
 *     tags: [Contas Bancárias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
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
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar conta bancária' });
  }
});

// @route   POST /api/contas-bancarias
// @desc    Criar nova conta bancária
// @access  Private
/**
 * @swagger
 * /api/contas-bancarias:
 *   post:
 *     summary: Criar nova conta bancária
 *     tags: [Contas Bancárias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, banco]
 *             properties:
 *               nome:
 *                 type: string
 *               banco:
 *                 type: string
 *               agencia:
 *                 type: string
 *               numeroConta:
 *                 type: string
 *               saldo:
 *                 type: number
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno
 */
router.post('/', [
  body('nome').notEmpty().withMessage('Nome é obrigatório').isLength({ max: 50 }).withMessage('Nome pode ter no máximo 50 caracteres'),
  body('banco').notEmpty().withMessage('Banco é obrigatório').isLength({ max: 50 }).withMessage('Banco pode ter no máximo 50 caracteres'),
  body('agencia').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Agência pode ter no máximo 20 caracteres'),
  body('numeroConta').optional({ checkFalsy: true }).isLength({ max: 30 }).withMessage('Número da conta pode ter no máximo 30 caracteres'),
  body('saldoInicial').optional({ checkFalsy: true }).isFloat().withMessage('Saldo inicial deve ser numérico')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, banco, numeroConta, agencia, saldoInicial } = req.body;

    const existingConta = await ContaBancaria.findOne({
      usuario: req.user._id,
      nome: { $regex: new RegExp(`^${escapeRegExp(nome)}$`, 'i') }
    });

    if (existingConta) {
      return res.status(400).json({ message: 'Você já possui uma conta com este nome.' });
    }

    const contaBancaria = await ContaBancaria.create({
      nome,
      banco,
      numeroConta,
      agencia,
      usuario: req.user._id
    });

    if (saldoInicial && parseFloat(saldoInicial) !== 0) {
      await Extrato.create({
        contaBancaria: contaBancaria._id,
        tipo: 'Saldo Inicial',
        valor: parseFloat(saldoInicial),
        motivo: 'Saldo Inicial da Conta',
        referencia: { tipo: 'Saldo Inicial' },
        usuario: req.user._id
      });
    }

    res.status(201).json(contaBancaria);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao criar conta bancária' });
  }
});

// @route   PUT /api/contas-bancarias:id
// @desc    Atualizar conta bancária
// @access  Private
/**
 * @swagger
 * /api/contas-bancarias/{id}:
 *   put:
 *     summary: Atualizar conta bancária
 *     tags: [Contas Bancárias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               banco:
 *                 type: string
 *               agencia:
 *                 type: string
 *               numeroConta:
 *                 type: string
 *               saldo:
 *                 type: number
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
router.put('/:id', [
  body('nome').notEmpty().withMessage('Nome é obrigatório').isLength({ max: 50 }).withMessage('Nome pode ter no máximo 50 caracteres'),
  body('banco').notEmpty().withMessage('Banco é obrigatório').isLength({ max: 50 }).withMessage('Banco pode ter no máximo 50 caracteres'),
  body('agencia').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Agência pode ter no máximo 20 caracteres'),
  body('numeroConta').optional({ checkFalsy: true }).isLength({ max: 30 }).withMessage('Número da conta pode ter no máximo 30 caracteres')
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

    const { nome, banco, numeroConta, agencia, ativo } = req.body;

    if (nome.toLowerCase() !== contaBancaria.nome.toLowerCase()) {
      const existingConta = await ContaBancaria.findOne({
        usuario: req.user._id,
        nome: { $regex: new RegExp(`^${escapeRegExp(nome)}$`, 'i') }
      });
      if (existingConta) {
        return res.status(400).json({ message: 'Você já possui outra conta com este nome.' });
      }
    }

    contaBancaria.nome = nome;
    contaBancaria.banco = banco;
    if (numeroConta !== undefined) contaBancaria.numeroConta = numeroConta;
    if (agencia !== undefined) contaBancaria.agencia = agencia;
    if (ativo !== undefined) contaBancaria.ativo = ativo;

    await contaBancaria.save();

    res.json(contaBancaria);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao atualizar conta bancária' });
  }
});

// @route   DELETE /api/contas-bancarias:id
// @desc    Excluir conta bancária
// @access  Private
/**
 * @swagger
 * /api/contas-bancarias/{id}:
 *   delete:
 *     summary: Excluir conta bancária
 *     tags: [Contas Bancárias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
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
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir conta bancária' });
  }
});

module.exports = router;

