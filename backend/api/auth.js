const { connectDB } = require('./lib/mongodb');

// Handler específico para autenticação
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
    
    // Roteamento básico
    if (req.method === 'POST' && path === '/login') {
      res.json({ 
        message: 'Login endpoint - em desenvolvimento',
        method: req.method,
        path: path
      });
      return;
    }
    
    if (req.method === 'POST' && path === '/register') {
      res.json({ 
        message: 'Register endpoint - em desenvolvimento',
        method: req.method,
        path: path
      });
      return;
    }
    
    // Resposta padrão para outros endpoints
    res.json({ 
      message: 'Auth endpoint funcionando',
      method: req.method,
      path: path,
      url: url
    });
    
  } catch (error) {
    console.error('Erro no handler de auth:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
