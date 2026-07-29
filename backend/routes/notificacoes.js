const express = require('express');
const mongoose = require('mongoose');
const Notificacao = require('../models/Notificacao');
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas

/**
 * @swagger
 * tags:
 *   name: Notificações
 *   description: Gerenciamento de notificações push e internas
 */
router.use(auth);

// @route   GET /api/notificacoes
// @desc    Obter todas as notificações do usuário
// @access  Private
/**
 * @swagger
 * /api/notificacoes:
 *   get:
 *     summary: Listar todas as notificações
 *     tags: [Notificações]
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
    const notificacoes = await Notificacao.find({ usuario: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50); // Limitar a 50 notificações mais recentes
    
    res.json(notificacoes);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
});

// @route   GET /api/notificacoes/nao-lidas
// @desc    Obter notificações não lidas
// @access  Private
/**
 * @swagger
 * /api/notificacoes/nao-lidas:
 *   get:
 *     summary: Contar notificações não lidas
 *     tags: [Notificações]
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
router.get('/nao-lidas', async (req, res) => {
  try {
    const notificacoes = await Notificacao.find({ 
      usuario: req.user._id, 
      lida: false 
    })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json(notificacoes);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar notificações não lidas' });
  }
});

// @route   PUT /api/notificacoes:id/marcar-lida
// @desc    Marcar notificação como lida
// @access  Private
/**
 * @swagger
 * /api/notificacoes/{id}/marcar-lida:
 *   put:
 *     summary: Marcar notificação como lida
 *     tags: [Notificações]
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
router.put('/:id/marcar-lida', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID de notificação inválido' });
  }

  try {
    const notificacao = await Notificacao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!notificacao) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    notificacao.lida = true;
    await notificacao.save();

    res.json(notificacao);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
  }
});

// @route   PUT /api/notificacoes/marcar-todas-lidas
// @desc    Marcar todas as notificações como lidas
// @access  Private
/**
 * @swagger
 * /api/notificacoes/marcar-todas-lidas:
 *   put:
 *     summary: Marcar todas como lidas
 *     tags: [Notificações]
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
router.put('/marcar-todas-lidas', async (req, res) => {
  try {
    await Notificacao.updateMany(
      { usuario: req.user._id, lida: false },
      { lida: true }
    );

    res.json({ message: 'Todas as notificações marcadas como lidas' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao marcar notificações como lidas' });
  }
});

// @route   DELETE /api/notificacoes/limpar-todas
// @desc    Limpar todas as notificações
// @access  Private
/**
 * @swagger
 * /api/notificacoes/limpar-todas:
 *   delete:
 *     summary: Limpar todas as notificações
 *     tags: [Notificações]
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
router.delete('/limpar-todas', async (req, res) => {
  try {
    logger.debug('🗑️ Tentando limpar notificações do usuário:', req.user._id);
    
    const resultado = await Notificacao.deleteMany({ usuario: req.user._id });
    logger.debug('📊 Resultado da exclusão:', resultado);

    res.json({ 
      message: 'Todas as notificações excluídas com sucesso',
      deletadas: resultado.deletedCount 
    });
  } catch (error) {
    logger.error('❌ Erro ao limpar notificações:', error);
    res.status(500).json({ message: 'Erro ao limpar notificações' });
  }
});

// @route   DELETE /api/notificacoes:id
// @desc    Excluir notificação
// @access  Private
/**
 * @swagger
 * /api/notificacoes/{id}:
 *   delete:
 *     summary: Excluir notificação
 *     tags: [Notificações]
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
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID de notificação inválido' });
  }

  try {
    const notificacao = await Notificacao.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!notificacao) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    await Notificacao.deleteOne({ _id: req.params.id });

    res.json({ message: 'Notificação excluída com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir notificação' });
  }
});

// @route   GET /api/notificacoes/ping
// @desc    Teste simples de conexão
// @access  Private
/**
 * @swagger
 * /api/notificacoes/ping:
 *   get:
 *     summary: Verificar conectividade
 *     tags: [Notificações]
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
router.get('/ping', async (req, res) => {
  logger.debug('🏓 PING recebido do usuário:', req.user._id);
  res.json({ 
    message: 'PONG - Servidor respondendo!',
    usuario: req.user._id,
    timestamp: new Date().toISOString()
  });
});

// @route   POST /api/notificacoes/teste-criacao
// @desc    Criar uma notificação de teste
// @access  Private
/**
 * @swagger
 * /api/notificacoes/teste-criacao:
 *   post:
 *     summary: Criar notificação de teste
 *     tags: [Notificações]
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
router.post('/teste-criacao', async (req, res) => {
  try {
    const NotificationService = require('../services/NotificationService');
    const notificacao = await NotificationService.criarNotificacao(
      req.user._id,
      'sistema',
      'Notificação de Teste',
      'Esta é uma notificação de teste gerada pelo sistema.'
    );
    res.json(notificacao || { titulo: 'Notificação de Teste', mensagem: 'Esta é uma notificação de teste gerada pelo sistema.' });
  } catch (error) {
    logger.error('Erro ao criar notificação de teste:', error);
    res.status(500).json({ message: 'Erro ao criar notificação de teste' });
  }
});
// @route   POST /api/notificacoes/verificar-agora
// @desc    Verificar notificações imediatamente (para teste)
// @access  Private
/**
 * @swagger
 * /api/notificacoes/verificar-agora:
 *   post:
 *     summary: Forçar verificação de contas vencidas
 *     tags: [Notificações]
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
router.post('/verificar-agora', async (req, res) => {
  try {
    logger.debug('🚀 Iniciando verificação manual de notificações...');
    logger.debug('Usuário:', req.user._id);
    
    const NotificationService = require('../services/NotificationService');
    await NotificationService.verificarContasVencidas();
    await NotificationService.verificarLimitesCartoes();
    
    res.json({ message: 'Verificação concluída' });
  } catch (error) {
    logger.error('Erro na verificação manual:', error);
    res.status(500).json({ message: 'Erro na verificação manual' });
  }
});

// @route   GET /api/notificacoes/contar
// @desc    Contar notificações do usuário
// @access  Private
/**
 * @swagger
 * /api/notificacoes/contar:
 *   get:
 *     summary: Contar total de notificações
 *     tags: [Notificações]
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
router.get('/contar', async (req, res) => {
  try {
    const total = await Notificacao.countDocuments({ usuario: req.user._id });
    const naoLidas = await Notificacao.countDocuments({ usuario: req.user._id, lida: false });
    const todas = await Notificacao.find({ usuario: req.user._id }).sort({ createdAt: -1 });
    
    res.json({ 
      total,
      naoLidas,
      notificacoes: todas
    });
  } catch (error) {
    logger.error('Erro ao contar notificações:', error);
    res.status(500).json({ message: 'Erro ao contar notificações' });
  }
});

// @route   POST /api/notificacoes/subscribe
// @desc    Registrar inscrição push do usuário
// @access  Private
/**
 * @swagger
 * /api/notificacoes/subscribe:
 *   post:
 *     summary: Registrar subscription push
 *     tags: [Notificações]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscription:
 *                 type: object
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
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    const usuarioId = req.user._id;

    logger.debug('📱 Registrando inscrição push para usuário:', usuarioId);
    
    // Salvar inscrição no banco de dados no modelo User
    const user = await require('../models/User').findById(usuarioId);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    
    // Verificar se a inscrição já existe para evitar duplicidade
    const subscriptionExists = user.pushSubscriptions?.some(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!subscriptionExists) {
      if (!user.pushSubscriptions) {
        user.pushSubscriptions = [];
      }
      user.pushSubscriptions.push(subscription);
      await user.save();
      logger.debug('Inscrição salva com sucesso no banco de dados.');
    } else {
      logger.debug('Inscrição já existe no banco de dados.');
    }

    res.json({ 
      message: 'Inscrição push registrada com sucesso',
      status: 'registered'
    });
  } catch (error) {
    logger.error('Erro ao registrar inscrição push:', error);
    res.status(500).json({ message: 'Erro ao registrar inscrição push' });
  }
});

// @route   POST /api/notificacoes/send-push
// @desc    Enviar notificação push (para testes)
// @access  Private
/**
 * @swagger
 * /api/notificacoes/send-push:
 *   post:
 *     summary: Enviar notificação push manual
 *     tags: [Notificações]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               mensagem:
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
router.post('/send-push', async (req, res) => {
  try {
    const { titulo, mensagem, url } = req.body;
    const usuarioId = req.user._id;

    logger.debug('📱 Enviando notificação push:', { titulo, mensagem, url });
    
    // Simular envio de notificação push
    // Em produção, aqui você usaria Web Push Protocol
    
    res.json({ 
      message: 'Notificação push enviada com sucesso',
      status: 'sent'
    });
  } catch (error) {
    logger.error('Erro ao enviar notificação push:', error);
    res.status(500).json({ message: 'Erro ao enviar notificação push' });
  }
});

// @route   POST /api/notificacoes/sync
// @desc    Sincronização em background
// @access  Private
/**
 * @swagger
 * /api/notificacoes/sync:
 *   post:
 *     summary: Sincronizar notificações
 *     tags: [Notificações]
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
router.post('/sync', async (req, res) => {
  try {
    logger.debug('🔄 Sincronização em background solicitada');
    
    // Aqui você poderia verificar se há novas notificações
    // e enviar para o cliente via WebSocket ou Polling
    
    res.json({ 
      message: 'Sincronização concluída',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Erro na sincronização:', error);
    res.status(500).json({ message: 'Erro na sincronização' });
  }
});

module.exports = router;
