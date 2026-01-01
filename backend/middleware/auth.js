const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('🔐 Middleware auth - Rota:', req.method, req.path);
    console.log('🔑 Token recebido:', token ? token.substring(0, 20) + '...' : 'NENHUM');
    
    if (!token) {
      console.log('❌ Token não fornecido');
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.log('❌ Usuário não encontrado para ID:', decoded.id);
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    console.log('✅ Usuário autenticado:', user.email);
    req.user = user;
    next();
  } catch (error) {
    console.log('❌ Erro na verificação do token:', error.message);
    res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = auth;

