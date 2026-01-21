const { connectDB } = require('../lib/mongodb');
const { logger } = require('../../utils/logger');

// Handler específico para autenticação
module.exports = async (req, res) => {
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Importar rotas de auth
    const authRoutes = require('../../routes/auth');
    
    // Aplicar middleware específico para auth
    const { setupMiddleware, authLimiter } = require('../lib/middleware');
    setupMiddleware(req.app);
    
    // Aplicar rate limiting específico para auth
    authLimiter(req, res, () => {
      // Roteamento manual para endpoints de auth
      if (req.method === 'POST' && req.path === '/login') {
        return authRoutes(req, res);
      }
      if (req.method === 'POST' && req.path === '/register') {
        return authRoutes(req, res);
      }
      if (req.method === 'POST' && req.path === '/forgot-password') {
        return authRoutes(req, res);
      }
      if (req.method === 'POST' && req.path === '/reset-password') {
        return authRoutes(req, res);
      }
      
      res.status(404).json({ message: 'Endpoint não encontrado' });
    });
    
  } catch (error) {
    logger.error('Erro no handler de auth:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
