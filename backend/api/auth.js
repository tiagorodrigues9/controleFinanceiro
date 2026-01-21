// Handler específico para autenticação - versão com MongoDB
const { connectDB } = require('./lib/mongodb');

module.exports = async (req, res) => {
  try {
    console.log('=== DEBUG AUTH HANDLER ===');
    console.log('req.method:', req.method);
    console.log('req.url:', req.url);
    
    // Configurar headers CORS primeiro
    res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      console.log('Respondendo OPTIONS');
      res.status(200).end();
      return;
    }
    
    // Tentar conectar ao MongoDB
    console.log('Tentando conectar ao MongoDB...');
    await connectDB();
    console.log('MongoDB conectado com sucesso!');
    
    // Resposta com sucesso
    console.log('Respondendo sucesso');
    res.json({ 
      message: 'Auth handler funcionando com MongoDB!',
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
      mongodb: 'connected'
    });
    
  } catch (error) {
    console.error('=== ERRO NO AUTH HANDLER ===');
    console.error('Erro:', error);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message,
      stack: error.stack
    });
  }
};
