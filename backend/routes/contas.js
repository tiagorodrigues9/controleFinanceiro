const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Conta = require('../models/Conta');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const Cartao = require('../models/Cartao');
const Fornecedor = require('../models/Fornecedor');
const Gasto = require('../models/Gasto');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const NotificationService = require('../services/NotificationService');
const { logger } = require('../utils/logger');
const validateObjectId = require('../middleware/validateObjectId');
const { calcularDatasFatura, buscarOuCriarFaturaAberta } = require('../utils/faturaUtils');

const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Contas a Pagar
 *   description: Gerenciamento de contas a pagar, pagamentos e estornos
 */
router.param('id', validateObjectId);

const crypto = require('crypto');

// Configurar multer para upload de arquivos de forma segura
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Sanitizar nome do arquivo usando UUID e manter apenas a extensão original
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = crypto.randomUUID() + ext;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    // Permitir apenas imagens e PDFs
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Apenas JPEG, PNG e PDF são aceitos.'));
    }
  }
});

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/contas
// @desc    Obter todas as contas do usuário
// @access  Private
/**
 * @swagger
 * /api/contas:
 *   get:
 *     summary: Listar contas a pagar
 *     tags: [Contas a Pagar]
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
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['pendentes', 'pagas', 'vencidas', 'todos']
 *       - in: query
 *         name: ativo
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['ativas', 'inativas', 'todas']
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
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
router.get('/', async (req, res) => {
  try {
    logger.debug('🔍 Rotas Contas - GET /api/contas chamado');
    logger.debug('🔍 Rotas Contas - req.user._id:', req.user._id);

    const { mes, ano, ativo, status, dataInicio, dataFim } = req.query;
    const query = { usuario: req.user._id, valor: { $ne: null } };

    logger.debug('🔍 Rotas Contas - Query params:', { mes, ano, ativo, status });

    // filtro por mês/ano (dataVencimento)
    if (mes && ano) {
      const startDate = new Date(ano, mes - 1, 1);
      const endDate = new Date(ano, mes, 0, 23, 59, 59);
      query.dataVencimento = { $gte: startDate, $lte: endDate };
    }

    // filtro ativo: 'ativas' | 'inativas' | 'todas'
    if (ativo === 'ativas') query.ativo = { $ne: false };
    if (ativo === 'inativas') query.ativo = false;

    // filtro status: 'pendentes' | 'pagas' | 'vencidas' | 'todos'
    if (status === 'pendentes') query.status = 'Pendente';
    if (status === 'pagas') query.status = 'Pago';
    if (status === 'vencidas') query.status = 'Vencida';

    // filtro por intervalo arbitrário
    if (dataInicio) {
      const inicio = new Date(dataInicio);
      query.dataVencimento = query.dataVencimento || {};
      query.dataVencimento.$gte = inicio;
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23, 59, 59, 999);
      query.dataVencimento = query.dataVencimento || {};
      query.dataVencimento.$lte = fim;
    }

    logger.info('Buscando contas', { userId: req.user._id, filters: { mes, ano, ativo, status } });

    // Garantir que contas pendentes e vencidas estejam com o status correto em tempo real (Safety Net)
    const agora = new Date();
    const hojeUTC = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
    
    await Conta.updateMany(
      {
        usuario: req.user._id,
        status: 'Pendente',
        dataVencimento: { $lt: hojeUTC },
        ativo: { $ne: false }
      },
      { $set: { status: 'Vencida' } }
    );
    
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [contas, total] = await Promise.all([
      Conta.find(query)
        .populate('fornecedor')
        .populate('contaBancaria')
        .sort({ dataVencimento: 1 })
        .skip(skip)
        .limit(limit),
      Conta.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    logger.info('Contas encontradas', { count: contas.length, total, page, limit });

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Total-Pages', totalPages);

    res.json({
      items: contas,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    logger.error('Erro ao buscar contas', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao buscar contas' });
  }
});

// @route   GET /api/contas:id
// @desc    Obter conta específica
// @access  Private
/**
 * @swagger
 * /api/contas/{id}:
 *   get:
 *     summary: Obter conta por ID
 *     tags: [Contas a Pagar]
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
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id
    })
      .populate('fornecedor')
      .populate('contaBancaria');

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    res.json(conta);
  } catch (error) {
    logger.error('Erro ao buscar conta', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao buscar conta' });
  }
});

// @route   POST /api/contas
// @desc    Criar nova conta
// @access  Private
/**
 * @swagger
 * /api/contas:
 *   post:
 *     summary: Criar nova conta a pagar (suporta anexo)
 *     tags: [Contas a Pagar]
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
router.post('/', upload.single('anexo'), [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('dataVencimento').optional().notEmpty().withMessage('Data de vencimento é obrigatória'),
  body('valor').optional().isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a zero'),
  body('fornecedor').notEmpty().withMessage('Fornecedor é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, dataVencimento, valor, fornecedor, observacao, totalParcelas, parcelaId, parcelMode, parcelas, tipoControle, tipoDespesa } = req.body;

    logger.info('Cadastrando conta', { nome, dataVencimento, valor, fornecedor, userId: req.user._id });

    let dataVencimentoParsed;
    if (dataVencimento) {
      const [year, month, day] = dataVencimento.split('-').map(Number);
      dataVencimentoParsed = new Date(year, month - 1, day, 12, 0, 0);
    }

    const contaData = {
      nome,
      dataVencimento: dataVencimentoParsed,
      valor: parseFloat(valor),
      fornecedor,
      observacao,
      tipoControle,
      tipoDespesa,
      usuario: req.user._id,
      status: 'Pendente'
    };

    if (req.file) {
      contaData.anexo = req.file.path;
    }

    if (parcelMode === 'manual') {
      const parcelasList = typeof parcelas === 'string' ? JSON.parse(parcelas) : parcelas;
      const parcelaIdFinal = Date.now().toString();
      for (let i = 0; i < parcelasList.length; i++) {
        const parcela = parcelasList[i];
        const [year, month, day] = parcela.data.split('-').map(Number);
        const dataParcela = new Date(year, month - 1, day, 12, 0, 0);
        const parcelaData = {
          nome: `${nome} - Parcela ${i + 1}`,
          dataVencimento: dataParcela,
          valor: parseFloat(parcela.valor),
          fornecedor,
          observacao,
          tipoControle,
          tipoDespesa,
          usuario: req.user._id,
          status: 'Pendente',
          parcelaAtual: i + 1,
          totalParcelas: parcelasList.length,
          parcelaId: parcelaIdFinal
        };
        if (req.file) {
          parcelaData.anexo = req.file.path;
        }
        const newParcela = new Conta(parcelaData);
        await newParcela.save();
      }
      res.json({ message: 'Parcelas criadas com sucesso' });
    } else {
      // Se for parcelamento normal
      if (totalParcelas && totalParcelas > 1) {
        const parcelas = [];
        const parcelaIdFinal = parcelaId || Date.now().toString();
        let valorParcela;
        const dataBase = new Date(dataVencimentoParsed);

        if (parcelMode === 'mesmo_valor') {
          valorParcela = parseFloat(valor);
        } else {
          // dividir or manual, default to dividir
          valorParcela = parseFloat(valor) / parseInt(totalParcelas);
        }

        for (let i = 1; i <= totalParcelas; i++) {
          const dataVencimentoParcela = new Date(dataBase);
          dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + (i - 1));

          const parcela = {
            ...contaData,
            nome: `${nome} - Parcela ${i} de ${totalParcelas}`,
            valor: valorParcela,
            dataVencimento: dataVencimentoParcela,
            parcelaAtual: i,
            totalParcelas: parseInt(totalParcelas),
            parcelaId: parcelaIdFinal
          };

          parcelas.push(parcela);
        }

        const contasCriadas = await Conta.insertMany(parcelas);
        logger.info('Contas parceladas criadas', { count: contasCriadas.length });
        return res.status(201).json(contasCriadas);
      }

      const conta = await Conta.create(contaData);
      logger.info('Conta criada com sucesso', { contaId: conta._id });
      res.status(201).json(conta);
    }
  } catch (error) {
    logger.error('Erro ao criar conta', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao criar conta' });
  }
});

// @route   PUT /api/contas:id
// @desc    Atualizar conta
// @access  Private
/**
 * @swagger
 * /api/contas/{id}:
 *   put:
 *     summary: Atualizar conta a pagar
 *     tags: [Contas a Pagar]
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
router.put('/:id', upload.single('anexo'), async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      ativo: { $ne: false }
    });

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    if (conta.status === 'Pago') {
      return res.status(400).json({ message: 'Contas pagas não podem ser editadas' });
    }

    const { nome, dataVencimento, valor, fornecedor, observacao, tipoControle, tipoDespesa } = req.body;

    if (nome) conta.nome = nome;
    if (dataVencimento) conta.dataVencimento = new Date(dataVencimento);
    if (valor) conta.valor = parseFloat(valor);
    if (fornecedor) conta.fornecedor = fornecedor;
    if (observacao !== undefined) conta.observacao = observacao;
    if (tipoControle !== undefined) conta.tipoControle = tipoControle;
    if (tipoDespesa !== undefined) conta.tipoDespesa = tipoDespesa;
    if (req.file) conta.anexo = req.file.path;

    await conta.save();

    res.json(conta);
  } catch (error) {
    logger.error('Erro ao atualizar conta', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao atualizar conta' });
  }
});

// @route   GET /api/contas:id/check-installments
// @desc    Verificar se há parcelas restantes para a conta
// @access  Private
/**
 * @swagger
 * /api/contas/{id}/check-installments:
 *   get:
 *     summary: Verificar parcelas da conta
 *     tags: [Contas a Pagar]
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
router.get('/:id/check-installments', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de conta inválido' });
    }

    const conta = await Conta.findOne({ _id: req.params.id, usuario: req.user._id });
    if (!conta) return res.status(404).json({ message: 'Conta não encontrada' });

    let remainingCount = 0;
    if (conta.parcelaId) {
      const remainingInstallments = await Conta.find({
        parcelaId: conta.parcelaId,
        usuario: req.user._id,
        ativo: { $ne: false },
        _id: { $ne: conta._id }
      });
      remainingCount = remainingInstallments.length;
    }

    res.json({ hasRemainingInstallments: remainingCount > 0, remainingCount });
  } catch (error) {
    logger.error('Erro ao verificar parcelas', { error: error.message });
    res.status(500).json({ message: 'Erro ao verificar parcelas' });
  }
});

// @route   DELETE /api/contas:id
// @desc    Excluir conta permanentemente
// @access  Private
/**
 * @swagger
 * /api/contas/{id}:
 *   delete:
 *     summary: Inativar conta (soft delete)
 *     tags: [Contas a Pagar]
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
    // Validar se o ID é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de conta inválido' });
    }

    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!conta) {
      logger.debug('DEBUG: Retornando 404 - Conta não encontrada');
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    // Check if there are remaining active installments
    let hasRemainingInstallments = false;
    let remainingCount = 0;

    if (conta.parcelaId && req.query.force !== 'true') {
      const remainingInstallments = await Conta.find({
        parcelaId: conta.parcelaId,
        usuario: req.user._id,
        ativo: { $ne: false },
        _id: { $ne: conta._id } // Excluir a conta atual
      });
      remainingCount = remainingInstallments.length;
      hasRemainingInstallments = remainingCount > 0;
    }

    if (hasRemainingInstallments) {
      return res.status(409).json({
        hasRemainingInstallments: true,
        remainingCount,
        message: `Existem ${remainingCount} parcela(s) restante(s) deste grupo. Deseja excluir apenas esta ou todas as restantes?`
      });
    }

    // Excluir permanentemente
    await Conta.deleteOne({ _id: req.params.id, usuario: req.user._id });

    res.json({ message: 'Conta excluída permanentemente com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir parcelas' });
  }
});

// @route   DELETE /api/contas:id/hard-all-remaining
// @desc    Inativar todas as parcelas do mesmo grupo
// @access  Private
/**
 * @swagger
 * /api/contas/{id}/hard-all-remaining:
 *   delete:
 *     summary: Excluir todas as parcelas restantes
 *     tags: [Contas a Pagar]
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
router.delete('/:id/hard-all-remaining', async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      parcelaId: { $exists: true }
    });

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada ou não pertence a um grupo de parcelas' });
    }

    // Inativar todas as parcelas do mesmo parcelaId
    const result = await Conta.updateMany(
      {
        parcelaId: conta.parcelaId,
        usuario: req.user._id
      },
      {
        ativo: false,
        status: 'Cancelada'
      }
    );

    res.json({
      message: 'Todas as parcelas foram inativadas com sucesso',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao inativar parcelas' });
  }
});

// @route   DELETE /api/contas:id/cancel-all-remaining
// @desc    Excluir todas as parcelas do mesmo grupo
// @access  Private
/**
 * @swagger
 * /api/contas/{id}/cancel-all-remaining:
 *   delete:
 *     summary: Cancelar todas as parcelas restantes
 *     tags: [Contas a Pagar]
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
router.delete('/:id/cancel-all-remaining', async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      parcelaId: { $exists: true }
    });

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada ou não pertence a um grupo de parcelas' });
    }

    // Excluir permanentemente todas as parcelas do mesmo parcelaId
    const result = await Conta.deleteMany({
      parcelaId: conta.parcelaId,
      usuario: req.user._id
    });

    logger.info('Parcelas excluídas permanentemente', {
      parcelaId: conta.parcelaId,
      count: result.deletedCount
    });

    res.json({
      message: `${result.deletedCount} parcela(s) excluída(s) permanentemente com sucesso`,
      count: result.deletedCount
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir parcelas' });
  }
});

// @route   DELETE /api/contas:id/hard
// @desc    Inativar conta permanentemente (apenas usuário dono)
// @access  Private
/**
 * @swagger
 * /api/contas/{id}/hard:
 *   delete:
 *     summary: Excluir conta permanentemente (hard delete)
 *     tags: [Contas a Pagar]
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
router.delete('/:id/hard', async (req, res) => {
  try {
    const conta = await Conta.findOne({ _id: req.params.id, usuario: req.user._id });
    if (!conta) return res.status(404).json({ message: 'Conta não encontrada' });

    // Soft inactivate em vez de excluir fisicamente
    conta.ativo = false;
    conta.status = 'Cancelada';
    await conta.save();

    res.json({ message: 'Conta inativada com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao inativar conta' });
  }
});

// @route   DELETE /api/contas:id/permanent
// @desc    Excluir permanentemente conta inativa (apenas usuário dono)
// @access  Private
/**
 * @swagger
 * /api/contas/{id}/permanent:
 *   delete:
 *     summary: Excluir conta e todas as parcelas permanentemente
 *     tags: [Contas a Pagar]
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
router.delete('/:id/permanent', async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      ativo: false // Apenas pode excluir se já estiver inativa
    });

    if (!conta) {
      return res.status(404).json({
        message: 'Conta não encontrada ou ainda está ativa. Inative a conta primeiro.'
      });
    }

    // Verificar se há parcelas restantes
    if (conta.parcelaId) {
      const remainingInstallments = await Conta.find({
        parcelaId: conta.parcelaId,
        usuario: req.user._id,
        ativo: { $ne: false },
        _id: { $ne: conta._id }
      });

      if (remainingInstallments.length > 0) {
        return res.status(400).json({
          message: `Existem ${remainingInstallments.length} parcela(s) restantes. Cancele todas as parcelas primeiro.`,
          remainingInstallments: remainingInstallments.length
        });
      }
    }

    // Excluir permanentemente
    await Conta.deleteOne({ _id: req.params.id, usuario: req.user._id });

    logger.info('Conta excluída permanentemente', {
      contaId: conta._id,
      nome: conta.nome,
      userId: req.user._id
    });

    res.json({ message: 'Conta excluída permanentemente com sucesso' });
  } catch (error) {
    logger.error('Erro ao excluir conta permanentemente', {
      error: error.message,
      stack: error.stack,
      contaId: req.params.id,
      userId: req.user._id
    });
    res.status(500).json({ message: 'Erro ao excluir conta' });
  }
});

// @route   POST /api/contas:id/pagar
// @desc    Pagar conta
// @access  Private
/**
 * @swagger
 * /api/contas/{id}/pagar:
 *   post:
 *     summary: Pagar conta
 *     tags: [Contas a Pagar]
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
 *             required: [contaBancaria]
 *             properties:
 *               contaBancaria:
 *                 type: string
 *               dataPagamento:
 *                 type: string
 *               jurosPago:
 *                 type: number
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
router.post('/:id/pagar', [
  body('formaPagamento').notEmpty().withMessage('Forma de pagamento é obrigatória'),
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { formaPagamento, contaBancaria, cartao, juros } = req.body;

    // Validação customizada: cartão é obrigatório para pagamentos com cartão
    if ((formaPagamento === 'Cartão de Crédito' || formaPagamento === 'Cartão de Débito') && !cartao) {
      return res.status(400).json({ message: 'Cartão é obrigatório para pagamentos com cartão' });
    }

    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      ativo: { $ne: false }
    }).populate('fornecedor');

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    if (conta.status === 'Pago') {
      return res.status(400).json({ message: 'Conta já foi paga' });
    }

    if (conta.status === 'Cancelada') {
      return res.status(400).json({ message: 'Conta cancelada não pode ser paga' });
    }

    // Verificar se conta bancária informada existe e está ativa
    const contaBancariaObj = await ContaBancaria.findOne({ _id: contaBancaria, usuario: req.user._id, ativo: { $ne: false } });
    if (!contaBancariaObj) {
      return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
    }

    // Se for pagamento com cartão, verificar se o cartão existe
    let cartaoObj = null;
    if (cartao) {
      cartaoObj = await Cartao.findOne({ _id: cartao, usuario: req.user._id, ativo: true });
      if (!cartaoObj) {
        return res.status(400).json({ message: 'Cartão inválido ou inativo' });
      }
    }

    // Usar transação para garantir consistência (pagar conta + criar extrato atomicamente)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      conta.status = 'Pago';
      conta.dataPagamento = new Date();
      conta.formaPagamento = formaPagamento;
      conta.contaBancaria = contaBancaria;
      conta.cartao = cartaoObj ? cartaoObj._id : null;
      if (juros) {
        conta.jurosPago = parseFloat(juros);
      }
      await conta.save({ session });

      const valorPago = conta.valor + (conta.jurosPago || 0);

      if (conta.tipoDespesa && conta.tipoDespesa.grupo) {
        const Gasto = require('../models/Gasto');
        await Gasto.create([{
          tipoDespesa: conta.tipoDespesa,
          valor: valorPago,
          data: new Date(),
          local: conta.fornecedor?.nome || 'Pagamento de conta',
          observacao: `[Pagamento da Conta]: ${conta.nome} - ID:${conta._id}`,
          formaPagamento,
          contaBancaria: contaBancaria,
          cartao: cartaoObj ? cartaoObj._id : null,
          usuario: req.user._id
        }], { session });
      }

      // Criar registro no extrato apenas para pagamentos que afetam a conta bancária imediatamente
      if (formaPagamento !== 'Cartão de Crédito') {
        await Extrato.create([{
          contaBancaria: contaBancaria, // 
          cartao: cartaoObj ? cartaoObj._id : null,
          tipo: 'Saída',
          valor: valorPago,
          data: new Date(),
          motivo: `Pagamento: ${conta.nome} - ${conta.fornecedor?.nome || 'Fornecedor não informado'}${juros ? ` (juros: R$ ${juros})` : ''}`,
          referencia: {
            tipo: 'Conta',
            id: conta._id
          },
          usuario: req.user._id
        }], { session });
      } else {
        // Para cartão de crédito, adicionar à fatura do cartão
        if (cartaoObj) {
          const FaturaCartao = require('../models/FaturaCartao');

          // Determinar a data do pagamento para enviar ao novo robô de faturas
          const dataPagamento = new Date();

          // Buscar ou criar fatura do mês com a nova assinatura segura
          let fatura = await buscarOuCriarFaturaAberta(
            cartaoObj,
            req.user._id,
            dataPagamento
          );

          // Adicionar despesa à fatura
          await fatura.adicionarDespesa(
            conta._id,
            valorPago,
            dataPagamento,
            `${conta.nome} - ${conta.fornecedor?.nome || 'Fornecedor não informado'}`,
            session
          );
        }
      }

      await session.commitTransaction();
      res.json(conta);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error('❌ Erro ao pagar conta:', error.message);
    logger.error('❌ Stack completo:', error.stack);
    logger.error('❌ Dados da requisição:', {
      contaId: req.params.id,
      formaPagamento: req.body.formaPagamento,
      contaBancaria: req.body.contaBancaria,
      cartao: req.body.cartao,
      juros: req.body.juros,
      usuario: req.user?._id
    });
    res.status(500).json({ message: 'Erro ao pagar conta' });
  }
});

// @route   POST /api/contas:id/estornar
// @desc    Estornar pagamento de conta e limpar Extrato/Gastos/Faturas
// @access  Private
/**
 * @swagger
 * /api/contas/{id}/estornar:
 *   post:
 *     summary: Estornar pagamento de conta
 *     tags: [Contas a Pagar]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
router.post('/:id/estornar', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      ativo: { $ne: false }
    }).populate('fornecedor');

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    if (conta.status !== 'Pago') {
      return res.status(400).json({ message: 'Apenas contas pagas podem ser estornadas' });
    }

    const valorPago = conta.valor + (conta.jurosPago || 0);

    // 1. Remover Gasto Espelho (se foi criado)
    const Gasto = require('../models/Gasto');
    await Gasto.deleteMany({
      usuario: req.user._id,
      observacao: `[Pagamento da Conta]: ${conta.nome} - ID:${conta._id}`
    }, { session });

    // Para gastos antigos (antes da atualização da observação com o ID)
    await Gasto.deleteMany({
      usuario: req.user._id,
      observacao: `Pagamento da conta: ${conta.nome}`,
      valor: valorPago
    }, { session });

    // 2. Extrato - Estornar/Remover Saída
    if (conta.formaPagamento !== 'Cartão de Crédito') {
      await Extrato.deleteMany({
        usuario: req.user._id,
        'referencia.tipo': 'Conta',
        'referencia.id': conta._id
      }, { session });
    } else {
      // 3. Remover a despesa da Fatura do Cartão de Crédito
      const FaturaCartao = require('../models/FaturaCartao');
      const faturaAntiga = await FaturaCartao.findOne({
        usuario: req.user._id,
        'despesas.conta': conta._id
      }).session(session);

      if (faturaAntiga) {
        // Deduzir o valor
        faturaAntiga.valorTotal = Math.round((faturaAntiga.valorTotal - valorPago) * 100) / 100;
        if (faturaAntiga.valorTotal < 0) faturaAntiga.valorTotal = 0;
        // Filtrar a despesa
        faturaAntiga.despesas = faturaAntiga.despesas.filter(d => d.conta && d.conta.toString() !== conta._id.toString());
        await faturaAntiga.save({ session });
      }
    }

    // 4. Restaurar a Conta
    conta.status = 'Pendente';
    conta.dataPagamento = null;
    conta.formaPagamento = null;
    conta.contaBancaria = null;
    conta.cartao = null;
    conta.jurosPago = 0;

    // Validar se não está Vencida
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (conta.dataVencimento < hoje) {
      conta.status = 'Vencida';
    }

    await conta.save({ session });

    await session.commitTransaction();
    res.json({ message: 'Pagamento estornado com sucesso', conta });
  } catch (error) {
    await session.abortTransaction();
    logger.error('❌ Erro ao estornar conta:', error.message);
    res.status(500).json({ message: 'Erro ao estornar pagamento da conta' });
  } finally {
    await session.endSession();
  }
});

module.exports = router;


