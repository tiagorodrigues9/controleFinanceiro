const jwt = require('jsonwebtoken');
const User = require('../models/User');
const NodeCache = require('node-cache');
const { connectDB } = require('../utils/db');
const { logger } = require('../utils/logger');

// Cache para evitar queries repetitivas ao banco (TTL de 5 minutos)
const userAuthCache = new NodeCache({ stdTTL: 300 });

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
      await connectDB();
      
      // Se não estiver no cache, buscar no banco
      user = await User.findById(decoded.id).select('_id email nome endereco bairro cidade telefone fotoPerfil configuracoes').lean();
      
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
    logger.error('Erro interno no middleware de auth:', error);
    return res.status(500).json({ message: 'Erro interno no servidor ao validar autenticação.' });
  }
};

auth.clearCache = (userId) => {
  if (userId) {
    userAuthCache.del(userId.toString());
  }
};

module.exports = auth;
