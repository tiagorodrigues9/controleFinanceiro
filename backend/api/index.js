const { connectDB } = require('./lib/mongodb');
const { logger } = require('../utils/logger');

// Handler principal para Vercel
module.exports = async (req, res) => {
  try {
    // Configurar headers CORS manualmente
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Conectar ao MongoDB
    await connectDB();
    
    // Rota raiz
    if (req.url === '/' || req.url === '') {
      res.json({ 
        message: 'API do Controle Financeiro está rodando no Vercel!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Health check para Vercel
    if (req.url === '/health' || req.url === '/ping') {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
      return;
    }
    
    // Se nenhuma rota corresponder, retorna 404
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
      path: req.url
    });
    
  } catch (error) {
    console.error('Erro no handler principal:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
