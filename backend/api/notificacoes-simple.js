const { connectDB } = require('./lib/mongodb');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Notificacao = require('../models/Notificacao');

module.exports = async (req, res) => {
  // CORS headers - mais simples e direto
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Autenticação
  auth(req, res, async () => {
    try {
      await connectDB();
      
      const { method } = req;
      const url = req.url || '';
      const path = url.split('?')[0];
      const cleanPath = path.replace('/api', '');
      
      console.log('=== NOTIFICACOES SIMPLE ===');
      console.log('method:', method);
      console.log('cleanPath:', cleanPath);
      console.log('user:', req.user?._id);
      
      // GET /notificacoes
      if (cleanPath === '/notificacoes' && method === 'GET') {
        const notificacoes = await Notificacao.find({ usuario: req.user._id })
          .sort({ data: -1 })
          .limit(50);
        return res.json(notificacoes);
      }
      
      // GET /notificacoes/nao-lidas
      if (cleanPath === '/notificacoes/nao-lidas' && method === 'GET') {
        const notificacoes = await Notificacao.find({ 
          usuario: req.user._id, 
          lida: false 
        }).sort({ data: -1 }).limit(50);
        return res.json(notificacoes);
      }
      
      // POST /notificacoes/teste-criacao
      if (cleanPath === '/notificacoes/teste-criacao' && method === 'POST') {
        console.log('Criando notificação de teste...');
        
        const notificacaoData = {
          titulo: 'Notificação de Teste',
          mensagem: 'Esta é uma notificação de teste do sistema!',
          tipo: 'outro',
          usuario: req.user._id,
          lida: false,
          data: new Date()
        };
        
        const notificacao = await Notificacao.create(notificacaoData);
        console.log('✅ Notificação criada:', notificacao._id);
        
        return res.status(201).json(notificacao);
      }
      
      // POST /notificacoes/subscribe
      if (cleanPath === '/notificacoes/subscribe' && method === 'POST') {
        console.log('Subscribe recebido');
        return res.json({ message: 'Subscribe recebido' });
      }
      
      // Default response
      res.status(404).json({ message: 'Endpoint não encontrado' });
      
    } catch (error) {
      console.error('Erro:', error);
      res.status(500).json({ 
        message: 'Erro interno', 
        error: error.message 
      });
    }
  });
};
