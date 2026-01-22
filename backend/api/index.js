const { connectDB } = require('./lib/mongodb');

// Handler principal para Vercel
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
    
    // Se for uma rota específica, não processar aqui (deixar o vercel.json redirecionar)
    if (path.startsWith('/api/auth/') || 
        path.startsWith('/api/dashboard') || 
        path.startsWith('/api/contas') || 
        path.startsWith('/api/fornecedores') || 
        path.startsWith('/api/gastos') || 
        path.startsWith('/api/contas-bancarias') || 
        path.startsWith('/api/grupos') || 
        path.startsWith('/api/extrato') || 
        path.startsWith('/api/transferencias') || 
        path.startsWith('/api/formas-pagamento') || 
        path.startsWith('/api/cartoes') || 
        path.startsWith('/api/notificacoes') || 
        path.startsWith('/api/emails')) {
      
      // Deixar o vercel.json redirecionar para o handler específico
      res.status(404).json({ 
        message: 'Endpoint não encontrado - deveria ser redirecionado',
        path: path,
        url: url
      });
      return;
    }
    
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
