const { connectDB } = require('./lib/mongodb');

// Handler específico para autenticação
module.exports = async (req, res) => {
  // Configurar headers CORS primeiro, antes de qualquer coisa
  res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  try {
    // Handle OPTIONS requests (preflight) - responder imediatamente
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
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
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
