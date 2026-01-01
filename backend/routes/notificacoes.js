const express = require('express');
const Notificacao = require('../models/Notificacao');
const auth = require('../middleware/auth');

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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
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
    console.error(error);
    res.status(500).json({ message: 'Erro ao marcar notificações como lidas' });
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
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir notificação' });
  }
});

// @route   DELETE /api/notificacoes/limpar-todas
// @desc    Limpar todas as notificações
// @access  Private
router.delete('/limpar-todas', async (req, res) => {
  try {
    console.log('🗑️ Tentando limpar notificações do usuário:', req.user._id);
    console.log('🔑 Token recebido:', req.header('Authorization')?.substring(0, 20) + '...');
    
    const resultado = await Notificacao.deleteMany({ usuario: req.user._id });
    console.log('📊 Resultado da exclusão:', resultado);

    res.json({ 
      message: 'Todas as notificações excluídas com sucesso',
      deletadas: resultado.deletedCount 
    });
  } catch (error) {
    console.error('❌ Erro ao limpar notificações:', error);
    res.status(500).json({ message: 'Erro ao limpar notificações' });
  }
});

// @route   GET /api/notificacoes/ping
// @desc    Teste simples de conexão
// @access  Private
router.get('/ping', async (req, res) => {
  console.log('🏓 PING recebido do usuário:', req.user._id);
  res.json({ 
    message: 'PONG - Servidor respondendo!',
    usuario: req.user._id,
    timestamp: new Date().toISOString()
  });
});

// @route   POST /api/notificacoes/verificar-agora
// @desc    Verificar notificações imediatamente (para teste)
// @access  Private
router.post('/verificar-agora', async (req, res) => {
  try {
    console.log('🚀 Iniciando verificação manual de notificações...');
    console.log('Usuário:', req.user._id);
    
    const NotificationService = require('../services/NotificationService');
    await NotificationService.verificarContasVencidas();
    await NotificationService.verificarLimitesCartoes();
    
    console.log('✅ Verificação manual concluída!');
    res.json({ message: 'Verificação de notificações executada com sucesso' });
  } catch (error) {
    console.error('❌ Erro na verificação manual:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ message: 'Erro ao verificar notificações', error: error.message });
  }
});

// @route   GET /api/notificacoes/debug
// @desc    Debug do sistema de notificações
// @access  Private
router.get('/debug', async (req, res) => {
  try {
    const Conta = require('../models/Conta');
    const User = require('../models/User');
    const hoje = new Date();
    
    // Verificar configurações do usuário
    const usuario = await User.findById(req.user._id);
    const configNotificacoes = usuario?.configuracoes?.notificacoes;
    
    // Verificar contas vencidas
    const contasVencidas = await Conta.find({
      usuario: req.user._id,
      dataVencimento: { $lt: hoje },
      status: { $in: ['Pendente', 'Vencida'] },
      ativo: { $ne: false }
    }).populate('fornecedor');
    
    // Verificar contas existentes
    const totalContas = await Conta.countDocuments({ usuario: req.user._id });
    
    // Verificar notificações existentes
    const totalNotificacoes = await Notificacao.countDocuments({ usuario: req.user._id });
    const notificacoesNaoLidas = await Notificacao.countDocuments({ 
      usuario: req.user._id, 
      lida: false 
    });
    
    res.json({
      debug: {
        usuario: {
          id: req.user._id,
          nome: usuario.nome,
          configuracoesNotificacoes: configNotificacoes
        },
        contas: {
          total: totalContas,
          vencidas: contasVencidas.length,
          detalhes: contasVencidas.map(c => ({
            nome: c.nome,
            fornecedor: c.fornecedor?.nome,
            dataVencimento: c.dataVencimento,
            status: c.status,
            valor: c.valor
          }))
        },
        notificacoes: {
          total: totalNotificacoes,
          naoLidas: notificacoesNaoLidas
        },
        dataAtual: hoje
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao obter debug' });
  }
});

// @route   POST /api/notificacoes/teste-criacao
// @desc    Teste simples de criação de notificação
// @access  Private
router.post('/teste-criacao', async (req, res) => {
  try {
    console.log('🧪 Teste de criação de notificação...');
    console.log('Usuário ID:', req.user._id);
    
    // Testar se o modelo Notificacao está funcionando
    console.log('Tentando criar notificação...');
    
    const notificacao = await Notificacao.create({
      usuario: req.user._id,
      tipo: 'conta_vencida',
      titulo: 'TESTE - Conta Vencida',
      mensagem: 'Esta é uma notificação de teste para verificar se o sistema funciona.',
      // Removendo referencia para testar sem ele
    });

    console.log('✅ Notificação de teste criada:', notificacao);
    res.json({ 
      message: 'Notificação de teste criada com sucesso',
      notificacao 
    });
  } catch (error) {
    console.error('❌ Erro ao criar notificação de teste:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      message: 'Erro ao criar notificação de teste', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// @route   GET /api/notificacoes/teste-simples
// @desc    Teste simples sem criar nada
// @access  Private
router.get('/teste-simples', async (req, res) => {
  try {
    console.log('🔍 Teste simples - verificando se a rota funciona...');
    console.log('Usuário ID:', req.user._id);
    console.log('Modelo Notificacao carregado:', !!Notificacao);
    
    res.json({ 
      message: 'Teste simples funcionou',
      usuario: req.user._id,
      modeloNotificacao: !!Notificacao
    });
  } catch (error) {
    console.error('❌ Erro no teste simples:', error);
    res.status(500).json({ 
      message: 'Erro no teste simples', 
      error: error.message 
    });
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
    
    console.log(`📊 Usuário ${req.user._id} tem ${total} notificações (${naoLidas} não lidas)`);
    console.log('📋 Todas as notificações:', todas.map(n => ({
      titulo: n.titulo,
      tipo: n.tipo,
      lida: n.lida,
      criada: n.createdAt
    })));
    
    res.json({ 
      total,
      naoLidas,
      notificacoes: todas
    });
  } catch (error) {
    console.error('Erro ao contar notificações:', error);
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

    console.log('📱 Registrando inscrição push para usuário:', usuarioId);
    
    // Salvar inscrição no banco de dados (poderia ser no modelo User)
    // Por enquanto, vamos apenas logar
    console.log('Endpoint:', endpoint);
    console.log('Keys:', keys);

    res.json({ 
      message: 'Inscrição push registrada com sucesso',
      status: 'registered'
    });
  } catch (error) {
    console.error('Erro ao registrar inscrição push:', error);
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

    console.log('📱 Enviando notificação push:', { titulo, mensagem, url });
    
    // Simular envio de notificação push
    // Em produção, aqui você usaria Web Push Protocol
    
    res.json({ 
      message: 'Notificação push enviada com sucesso',
      status: 'sent'
    });
  } catch (error) {
    console.error('Erro ao enviar notificação push:', error);
    res.status(500).json({ message: 'Erro ao enviar notificação push' });
  }
});

// @route   POST /api/notificacoes/sync
// @desc    Sincronização em background
// @access  Private
router.post('/sync', async (req, res) => {
  try {
    console.log('🔄 Sincronização em background solicitada');
    
    // Aqui você poderia verificar se há novas notificações
    // e enviar para o cliente via WebSocket ou Polling
    
    res.json({ 
      message: 'Sincronização concluída',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ message: 'Erro na sincronização' });
  }
});

module.exports = router;
