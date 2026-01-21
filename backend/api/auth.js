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
    
    // No Vercel, req.url contém o path completo após o nome do arquivo
    // Para api/auth.js, se a URL for /api/auth/login, req.url será /login
    const url = req.url || '';
    const path = url.split('?')[0]; // Remover query params
    
    // Debug para entender o que o Vercel está enviando
    console.log('Debug - req.url:', url);
    console.log('Debug - req.method:', req.method);
    console.log('Debug - path:', path);
    
    // Roteamento básico
    if (req.method === 'POST' && (path === '/login' || path === '')) {
      res.json({ 
        message: 'Login endpoint - em desenvolvimento',
        method: req.method,
        path: path,
        debug: { url, method: req.method }
      });
      return;
    }
    
    if (req.method === 'POST' && (path === '/register' || path === '')) {
      res.json({ 
        message: 'Register endpoint - em desenvolvimento',
        method: req.method,
        path: path,
        debug: { url, method: req.method }
      });
      return;
    }
    
    // Resposta padrão para outros endpoints
    res.json({ 
      message: 'Auth endpoint funcionando',
      method: req.method,
      path: path,
      url: url,
      debug: { url, method: req.method }
    });
    
  } catch (error) {
    console.error('Erro no handler de auth:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
