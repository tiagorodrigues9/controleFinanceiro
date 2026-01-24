const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  try {
    const token = req.headers && req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    // Apenas decodificar o token, sem buscar no MongoDB (evita timeouts)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Criar objeto user mínimo com dados do JWT
    req.user = {
      _id: decoded.id,
      email: decoded.email || 'user@example.com'
    };
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido.' });
  }
};

module.exports = auth;

