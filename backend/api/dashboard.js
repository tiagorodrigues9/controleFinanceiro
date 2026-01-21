const { connectDB } = require('../lib/mongodb');
const { logger } = require('../../utils/logger');

// Handler específico para dashboard
module.exports = async (req, res) => {
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Importar rota do dashboard
    const dashboardRoutes = require('../../routes/dashboard');
    
    // Aplicar middleware
    const { setupMiddleware } = require('../lib/middleware');
    setupMiddleware(req.app);
    
    // Roteamento para dashboard
    if (req.method === 'GET') {
      return dashboardRoutes(req, res);
    }
    
    res.status(405).json({ message: 'Método não permitido' });
    
  } catch (error) {
    logger.error('Erro no handler do dashboard:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
