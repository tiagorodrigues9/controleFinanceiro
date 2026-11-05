const express = require('express');
const { body, validationResult } = require('express-validator');
const Cartao = require('../models/Cartao');
const FaturaCartao = require('../models/FaturaCartao');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { logger } = require('../utils/logger');

const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Cartões
 *   description: CRUD de cartões de crédito e débito
 */
router.param('id', validateObjectId);

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/cartoes
// @desc    Obter todos os cartões do usuário
// @access  Private
/**
 * @swagger
 * /api/cartoes:
 *   get:
 *     summary: Listar todos os cartões do usuário
 *     tags: [Cartões]
 *     parameters:
 *       - in: query
 *         name: ativo
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
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
    const cartoes = await Cartao.find({ usuario: req.user._id })
      .sort({ ativo: -1, createdAt: -1 });
    res.json(cartoes);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar cartões' });
  }
});

// @route   POST /api/cartoes
// @desc    Criar novo cartão
// @access  Private
/**
 * @swagger
 * /api/cartoes:
 *   post:
 *     summary: Criar novo cartão
 *     tags: [Cartões]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, tipo]
 *             properties:
 *               nome:
 *                 type: string
 *               tipo:
 *                 type: string
 *               bandeira:
 *                 type: string
 *               banco:
 *                 type: string
 *               limite:
 *                 type: number
 *               diaFechamento:
 *                 type: integer
 *               diaVencimento:
 *                 type: integer
 *               contaBancaria:
 *                 type: string
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
  body('nome').notEmpty().trim().withMessage('Nome do cartão é obrigatório'),
  body('tipo').isIn(['Crédito', 'Débito']).withMessage('Tipo deve ser Crédito ou Débito'),
  body('banco').notEmpty().trim().withMessage('Banco é obrigatório'),
  body('limite').optional().isFloat({ min: 0 }).withMessage('Limite deve ser maior ou igual a zero'),
  body('diaFatura').optional().isInt({ min: 1, max: 31 }).withMessage('Dia da fatura deve ser entre 1 e 31'),
  body('diaVencimento').optional().isInt({ min: 1, max: 31 }).withMessage('Dia de vencimento deve ser entre 1 e 31'),
  body('dataVencimento').optional().isISO8601().withMessage('Data de vencimento deve ser uma data válida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, tipo, banco, limite, diaFatura, diaVencimento, dataVencimento } = req.body;

    // Verificar duplicata case-insensitive
    const cartaoExistente = await Cartao.findOne({ 
      nome: { $regex: new RegExp(`^${nome.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
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
      diaVencimento: tipo === 'Crédito' && diaVencimento ? parseInt(diaVencimento) : undefined,
      dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
      usuario: req.user._id
    });

    res.status(201).json(cartao);
  } catch (error) {
    logger.error('Erro ao criar cartão:', error);
    res.status(500).json({ message: 'Erro ao criar cartão' });
  }
});

// @route   PUT /api/cartoes:id
// @desc    Atualizar cartão
// @access  Private
/**
 * @swagger
 * /api/cartoes/{id}:
 *   put:
 *     summary: Atualizar cartão
 *     tags: [Cartões]
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
 *               tipo:
 *                 type: string
 *               bandeira:
 *                 type: string
 *               banco:
 *                 type: string
 *               limite:
 *                 type: number
 *               diaFechamento:
 *                 type: integer
 *               diaVencimento:
 *                 type: integer
 *               contaBancaria:
 *                 type: string
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
  body('nome').optional().notEmpty().trim().withMessage('Nome do cartão não pode ser vazio'),
  body('tipo').optional().isIn(['Crédito', 'Débito']).withMessage('Tipo deve ser Crédito ou Débito'),
  body('banco').optional().notEmpty().trim().withMessage('Banco não pode ser vazio'),
  body('limite').optional().isFloat({ min: 0 }).withMessage('Limite deve ser maior ou igual a zero'),
  body('diaFatura').optional().isInt({ min: 1, max: 31 }).withMessage('Dia da fatura deve ser entre 1 e 31'),
  body('diaVencimento').optional().isInt({ min: 1, max: 31 }).withMessage('Dia de vencimento deve ser entre 1 e 31'),
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

    const { nome, tipo, banco, limite, diaFatura, diaVencimento, dataVencimento } = req.body;

    // Se mudou o nome, verificar duplicata case-insensitive
    if (nome && nome.trim().toLowerCase() !== cartao.nome.toLowerCase()) {
      const cartaoExistente = await Cartao.findOne({ 
        nome: { $regex: new RegExp(`^${nome.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
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
    if (diaVencimento !== undefined) cartao.diaVencimento = parseInt(diaVencimento);
    if (dataVencimento !== undefined) cartao.dataVencimento = new Date(dataVencimento);

    // Se mudou para Débito, limpar campos específicos de crédito
    if (cartao.tipo === 'Débito') {
      cartao.limite = undefined;
      cartao.diaFatura = undefined;
      cartao.diaVencimento = undefined;
    }

    await cartao.save();
    res.json(cartao);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao atualizar cartão' });
  }
});

// @route   PUT /api/cartoes:id/inativar
// @desc    Inativar/Ativar cartão
// @access  Private
/**
 * @swagger
 * /api/cartoes/{id}/inativar:
 *   put:
 *     summary: Inativar cartão
 *     tags: [Cartões]
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
    logger.error(error);
    res.status(500).json({ message: 'Erro ao alterar status do cartão' });
  }
});

// @route   DELETE /api/cartoes:id
// @desc    Excluir cartão (com verificação de cascade)
// @access  Private
/**
 * @swagger
 * /api/cartoes/{id}:
 *   delete:
 *     summary: Excluir cartão
 *     tags: [Cartões]
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
    const cartao = await Cartao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!cartao) {
      return res.status(404).json({ message: 'Cartão não encontrado' });
    }

    // Verificar referências em outras tabelas antes de excluir
    const [faturasCount, gastosCount, extratosCount] = await Promise.all([
      FaturaCartao.countDocuments({ cartao: cartao._id, valorTotal: { $gt: 0 } }),
      Gasto.countDocuments({ cartao: cartao._id }),
      Extrato.countDocuments({ cartao: cartao._id, estornado: { $ne: true } })
    ]);

    const totalReferencias = faturasCount + gastosCount + extratosCount;

    if (totalReferencias > 0) {
      const detalhes = [];
      if (faturasCount > 0) detalhes.push(`${faturasCount} fatura(s)`);
      if (gastosCount > 0) detalhes.push(`${gastosCount} gasto(s)`);
      if (extratosCount > 0) detalhes.push(`${extratosCount} extrato(s)`);

      return res.status(409).json({ 
        message: `Não é possível excluir este cartão pois ele possui ${detalhes.join(', ')} vinculado(s). Considere inativá-lo.`
      });
    }

    await Promise.all([
      FaturaCartao.deleteMany({ cartao: req.params.id }),
      Extrato.deleteMany({ cartao: req.params.id, estornado: true }),
      Cartao.deleteOne({ _id: req.params.id })
    ]);
    res.json({ message: 'Cartão excluído com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir cartão' });
  }
});

// @route   GET /api/cartoes/relatorio-gastos
// @desc    Relatório de gastos por cartão no mês
// @access  Private
/**
 * @swagger
 * /api/cartoes/relatorio-gastos:
 *   get:
 *     summary: Relatório de gastos por cartão
 *     tags: [Cartões]
 *     parameters:
 *       - in: query
 *         name: mes
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: ano
 *         required: false
 *         schema:
 *           type: integer
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
router.get('/relatorio-gastos', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

    const startDate = new Date(anoAtual, mesAtual - 1, 1);
    const endDate = new Date(anoAtual, mesAtual, 0, 23, 59, 59);

    // Buscar todos os cartões do usuário (ativos e inativos para pegar histórico residual)
    const cartoes = await Cartao.find({ usuario: req.user._id });

    // Fazer uma única agregação otimizada no banco para somar os gastos de todos os cartões (Elimina N+1 Queries)
    const gastosAgregados = await Gasto.aggregate([
      {
        $match: {
          usuario: req.user._id,
          data: { $gte: startDate, $lte: endDate },
          cartao: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$cartao",
          totalGastos: { $sum: "$valor" },
          quantidadeTransacoes: { $sum: 1 }
        }
      }
    ]);

    // Converter para lookup de memória ultra-rápido O(1)
    const agregadosMap = {};
    gastosAgregados.forEach(item => {
      agregadosMap[item._id.toString()] = item;
    });

    const relatorio = cartoes
      .map(cartao => {
        const agg = agregadosMap[cartao._id.toString()] || { totalGastos: 0, quantidadeTransacoes: 0 };
        const totalGastos = agg.totalGastos;

        // Ocultar cartões inativos APENAS se eles não tiveram nenhuma movimentação neste mês
        if (!cartao.ativo && totalGastos === 0) return null;

        const limiteUtilizado = cartao.tipo === 'Crédito' && cartao.limite > 0
          ? (totalGastos / cartao.limite) * 100 
          : 0;

        return {
          cartaoId: cartao._id,
          nome: cartao.nome,
          tipo: cartao.tipo,
          banco: cartao.banco,
          limite: cartao.limite,
          totalGastos,
          quantidadeTransacoes: agg.quantidadeTransacoes,
          limiteUtilizado: cartao.tipo === 'Crédito' ? parseFloat(limiteUtilizado.toFixed(2)) : null,
          disponivel: cartao.tipo === 'Crédito' && cartao.limite ? cartao.limite - totalGastos : null
        };
      })
      .filter(item => item !== null); // Remove os nulos da inatividade zerada

    res.json(relatorio);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao gerar relatório de gastos' });
  }
});

module.exports = router;
