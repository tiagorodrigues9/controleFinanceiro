const { connectDB } = require('./lib/mongodb');
const { setupMiddleware } = require('./lib/middleware');
const { logger } = require('../utils/logger');

// Handler principal para Vercel
module.exports = async (req, res) => {
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Configurar middleware
    setupMiddleware(req.app);
    
    // Importar rotas dinamicamente
    const authRoutes = require('../routes/auth');
    const contasRoutes = require('../routes/contas');
    const fornecedoresRoutes = require('../routes/fornecedores');
    const gastosRoutes = require('../routes/gastos');
    const contasBancariasRoutes = require('../routes/contasBancarias');
    const gruposRoutes = require('../routes/grupos');
    const extratoRoutes = require('../routes/extrato');
    const dashboardRoutes = require('../routes/dashboard');
    const transferenciasRoutes = require('../routes/transferencias');
    const formasPagamentoRoutes = require('../routes/formas-pagamento');
    const cartoesRoutes = require('../routes/cartoes');
    const notificacoesRoutes = require('../routes/notificacoes');
    const emailsRoutes = require('../routes/emails');
    
    // Montar rotas
    req.app.use('/api/auth', authRoutes);
    req.app.use('/api/contas', contasRoutes);
    req.app.use('/api/fornecedores', fornecedoresRoutes);
    req.app.use('/api/gastos', gastosRoutes);
    req.app.use('/api/contas-bancarias', contasBancariasRoutes);
    req.app.use('/api/grupos', gruposRoutes);
    req.app.use('/api/extrato', extratoRoutes);
    req.app.use('/api/dashboard', dashboardRoutes);
    req.app.use('/api/transferencias', transferenciasRoutes);
    req.app.use('/api/formas-pagamento', formasPagamentoRoutes);
    req.app.use('/api/cartoes', cartoesRoutes);
    req.app.use('/api/notificacoes', notificacoesRoutes);
    req.app.use('/api/emails', emailsRoutes);
    
    // Rota raiz
    if (req.path === '/') {
      res.json({ 
        message: 'API do Controle Financeiro está rodando no Vercel!',
        version: '1.0.0',
        endpoints: {
          auth: '/api/auth',
          contas: '/api/contas',
          fornecedores: '/api/fornecedores',
          gastos: '/api/gastos',
          contasBancarias: '/api/contas-bancarias',
          grupos: '/api/grupos',
          extrato: '/api/extrato',
          dashboard: '/api/dashboard',
          transferencias: '/api/transferencias'
        }
      });
      return;
    }
    
    // Health check para Vercel
    if (req.path === '/health' || req.path === '/ping') {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
      return;
    }
    
    // Se nenhuma rota corresponder, continua para o Express
    req.app(req, res);
    
  } catch (error) {
    logger.error('Erro no handler principal:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
