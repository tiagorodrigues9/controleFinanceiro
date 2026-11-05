const express = require('express');
const mongoose = require('mongoose');
const Notificacao = require('../models/Notificacao');
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/notificacoes
// @desc    Obter todas as notificações do usuário
// @access  Private
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

// @route   PUT /api/notificacoes/:id/marcar-lida
// @desc    Marcar notificação como lida
// @access  Private
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

// @route   DELETE /api/notificacoes/:id
// @desc    Excluir notificação
// @access  Private
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
router.post('/subscribe', async (req, res) => {
  try {
    const subscription = req.body;
    const usuarioId = req.user._id;

    if (!subscription || !subscription.endpoint || typeof subscription.endpoint !== 'string') {
      return res.status(400).json({ message: 'Dados de inscrição push inválidos ou endpoint ausente' });
    }

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
// @desc    Enviar notificação push real (para testes do usuário logado)
// @access  Private
router.post('/send-push', async (req, res) => {
  try {
    const { titulo, mensagem, url } = req.body;
    const usuarioId = req.user._id;

    logger.debug('📱 Enviando notificação push para usuário:', usuarioId);
    
    const NotificationService = require('../services/NotificationService');
    const enviado = await NotificationService.enviarNotificacaoPush(
      usuarioId,
      titulo || 'Teste de Notificação Push',
      mensagem || 'Esta é uma notificação push real enviada pelo servidor!',
      url || '/notificacoes'
    );
    
    res.json({ 
      message: enviado ? 'Notificação push enviada com sucesso' : 'Não foi possível enviar push (nenhum dispositivo cadastrado ou chaves VAPID ausentes)',
      status: enviado ? 'sent' : 'failed'
    });
  } catch (error) {
    logger.error('Erro ao enviar notificação push:', error);
    res.status(500).json({ message: 'Erro ao enviar notificação push' });
  }
});

// @route   POST /api/notificacoes/verificar-usuario
// @desc    Verificar contas e limites do usuário autenticado (útil em serverless / on login)
// @access  Private
router.post('/verificar-usuario', async (req, res) => {
  try {
    const NotificationService = require('../services/NotificationService');
    const hoje = new Date();
    const daqui7dias = new Date();
    daqui7dias.setDate(hoje.getDate() + 7);

    await NotificationService.verificarContasUsuario(req.user._id, hoje, daqui7dias);
    
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    await NotificationService.verificarCartoesUsuario(req.user._id, primeiroDiaMes, ultimoDiaMes);

    res.json({ message: 'Verificação do usuário concluída com sucesso' });
  } catch (error) {
    logger.error('Erro ao verificar notificações do usuário:', error);
    res.status(500).json({ message: 'Erro ao processar notificações do usuário' });
  }
});

// @route   POST /api/notificacoes/sync
// @desc    Sincronização em background
// @access  Private
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
