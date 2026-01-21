const { connectDB } = require('../lib/mongodb');
const { logger } = require('../../utils/logger');

// Handler genérico para rotas CRUD
module.exports = async (req, res) => {
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Aplicar middleware
    const { setupMiddleware } = require('../lib/middleware');
    setupMiddleware(req.app);
    
    // Determinar qual rota baseado no path
    const path = req.path;
    let routeHandler;
    
    if (path.includes('/contas')) {
      routeHandler = require('../../routes/contas');
    } else if (path.includes('/fornecedores')) {
      routeHandler = require('../../routes/fornecedores');
    } else if (path.includes('/gastos')) {
      routeHandler = require('../../routes/gastos');
    } else if (path.includes('/contas-bancarias')) {
      routeHandler = require('../../routes/contasBancarias');
    } else if (path.includes('/grupos')) {
      routeHandler = require('../../routes/grupos');
    } else if (path.includes('/extrato')) {
      routeHandler = require('../../routes/extrato');
    } else if (path.includes('/transferencias')) {
      routeHandler = require('../../routes/transferencias');
    } else if (path.includes('/formas-pagamento')) {
      routeHandler = require('../../routes/formas-pagamento');
    } else if (path.includes('/cartoes')) {
      routeHandler = require('../../routes/cartoes');
    } else if (path.includes('/notificacoes')) {
      routeHandler = require('../../routes/notificacoes');
    } else if (path.includes('/emails')) {
      routeHandler = require('../../routes/emails');
    }
    
    if (routeHandler) {
      return routeHandler(req, res);
    }
    
    res.status(404).json({ message: 'Endpoint não encontrado' });
    
  } catch (error) {
    logger.error('Erro no handler genérico:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
