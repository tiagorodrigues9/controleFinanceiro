const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Cache simples para usuários (evita múltiplas buscas no MongoDB)
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const auth = async (req, res, next) => {
  console.log('🔍 Backend Auth - Verificando autenticação para:', req.method, req.url);
  
  try {
    const token = req.headers && req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
    
    console.log('🔍 Backend Auth - Token recebido:', token ? 'SIM' : 'NÃO');
    console.log('🔍 Backend Auth - Header Authorization:', req.headers && req.headers.authorization ? 'SIM' : 'NÃO');
    
    if (!token) {
      console.log('❌ Backend Auth - Nenhum token fornecido');
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Backend Auth - Token decodificado com sucesso, user ID:', decoded.id);
    
    // Verificar cache primeiro
    const cacheKey = decoded.id.toString();
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser && (Date.now() - cachedUser.timestamp) < CACHE_TTL) {
      console.log('🚀 Backend Auth - Usuário encontrado no cache:', cachedUser.user.email);
      req.user = cachedUser.user;
      return next();
    }
    
    console.log('💾 Backend Auth - Buscando usuário no MongoDB...');
    const user = await User.findById(decoded.id).select('-password').lean(); // lean() para performance
    
    if (!user) {
      console.log('❌ Backend Auth - Usuário não encontrado no banco');
      return res.status(401).json({ message: 'Token inválido.' });
    }

    // Adicionar ao cache
    userCache.set(cacheKey, {
      user: user,
      timestamp: Date.now()
    });
    
    console.log('✅ Backend Auth - Usuário autenticado e cacheado:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Backend Auth - Erro na verificação:', error.message);
    res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = auth;

