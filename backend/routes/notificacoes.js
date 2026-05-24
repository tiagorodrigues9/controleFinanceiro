const express = require('express');
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
    const { endpoint, keys } = req.body;
    const usuarioId = req.user._id;

    logger.debug('📱 Registrando inscrição push para usuário:', usuarioId);
    
    // Salvar inscrição no banco de dados (poderia ser no modelo User)
    // Por enquanto, vamos apenas logar
    logger.debug('Endpoint:', endpoint);
    logger.debug('Keys:', keys);

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
