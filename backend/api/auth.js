const { connectDB } = require('./lib/mongodb');

// Handler específico para autenticação
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
    
    // Resposta simples por enquanto
    res.json({ 
      message: 'Auth endpoint funcionando',
      method: req.method,
      url: req.url
    });
    
  } catch (error) {
    console.error('Erro no handler de auth:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
