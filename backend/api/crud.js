const { connectDB } = require('./lib/mongodb');

// Handler genérico para rotas CRUD
module.exports = async (req, res) => {
  try {
    // Configurar headers CORS manualmente
    res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
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
    
    // Resposta simples por enquanto
    res.json({ 
      message: 'CRUD endpoint funcionando',
      method: req.method,
      path: path
    });
    
  } catch (error) {
    console.error('Erro no handler genérico:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
