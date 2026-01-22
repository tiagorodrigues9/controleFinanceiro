const jwt = require('jsonwebtoken');

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

    // Apenas decodificar o token, sem buscar no MongoDB (evita timeouts)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Backend Auth - Token decodificado com sucesso, user ID:', decoded.id);
    
    // Criar objeto user mínimo com dados do JWT
    req.user = {
      _id: decoded.id,
      email: decoded.email || 'user@example.com'
    };
    
    console.log('✅ Backend Auth - Usuário autenticado via JWT:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Backend Auth - Erro na verificação:', error.message);
    res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = auth;

