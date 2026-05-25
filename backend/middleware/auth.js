const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const NodeCache = require('node-cache');

// Cache para evitar queries repetitivas ao banco (TTL de 5 minutos)
const userAuthCache = new NodeCache({ stdTTL: 300 });

/**
 * Aguarda a conexão do Mongoose ficar pronta antes de fazer queries.
 * Essencial para ambientes serverless (Vercel) onde cold starts são frequentes.
 */
async function waitForConnection(timeoutMs = 25000) {
  if (mongoose.connection.readyState === 1) return; // Já conectado
  
  // Se está conectando (readyState 2), aguardar
  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }
  
  // Se está desconectado (0) ou desconectando (3), aguardar com timeout
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout aguardando conexão com MongoDB'));
    }, timeoutMs);
    
    mongoose.connection.once('connected', () => {
      clearTimeout(timeout);
      resolve();
    });
    
    mongoose.connection.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

const auth = async (req, res, next) => {
  try {
    const token = req.headers && req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar se o usuário está no cache
    let user = userAuthCache.get(decoded.id);
    
    if (!user) {
      // Garantir que a conexão com MongoDB está pronta antes de consultar
      await waitForConnection();
      
      // Se não estiver no cache, buscar no banco
      user = await User.findById(decoded.id).select('_id email nome').lean();
      
      if (!user) {
        return res.status(401).json({ message: 'Acesso negado. Usuário não encontrado.' });
      }
      
      // Salvar no cache
      userAuthCache.set(decoded.id, user);
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado.' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Token inválido.' });
    }
    
    // Se não for um erro do JWT (como erro de banco de dados, timeout, etc)
    console.error('Erro interno no middleware de auth:', error);
    return res.status(500).json({ message: 'Erro interno no servidor ao validar autenticação.' });
  }
};

module.exports = auth;
