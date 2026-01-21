const { connectDB } = require('./lib/mongodb');

// Handler principal para Vercel
module.exports = async (req, res) => {
  try {
    // Configurar headers CORS manualmente
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://controlefinanceiro-i7s6.onrender.com',
      'https://controle-financeiro-web.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    // Handle OPTIONS requests (preflight)
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Conectar ao MongoDB
    await connectDB();
    
    // Extrair path da URL
    const url = req.url || '';
    const path = url.split('?')[0]; // Remover query params
    
    // Rota raiz
    if (path === '/' || path === '') {
      res.json({ 
        message: 'API do Controle Financeiro está rodando no Vercel!',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Health check para Vercel
    if (path === '/health' || path === '/ping') {
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
      path: path,
      url: url
    });
    
  } catch (error) {
    console.error('Erro no handler principal:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
