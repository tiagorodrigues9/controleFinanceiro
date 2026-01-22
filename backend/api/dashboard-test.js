const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  console.log('🚀 DASHBOARD TESTE CHAMADO!!!');
  
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    console.log('🔍 PASSO 1: Verificando token...');
    
    const token = req.headers && req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    console.log('🔍 PASSO 2: Verificando JWT...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_jwt_secret_aqui');
    
    console.log('🔍 PASSO 3: Montando resposta...');
    const testData = {
      periodo: { mes: 1, ano: 2026 },
      contas: {
        totalPagar: 11,
        valorPagarMes: 1500.50,
        pagasMes: 6,
        valorPagasMes: 550.79
      },
      financeiro: {
        saldoTotal: 9029.98,
        totalContasBancarias: 3,
        totalGastosMes: 2133.90,
        totalEntradasMes: 3242.91,
        totalSaidasMes: 3199.87,
        saldoMes: 43.04
      },
      // Campos que o frontend espera
      totalValorContasPagarMes: 1500.50,
      totalContasPendentesMes: 11,
      totalContasPagas: 6,
      totalContasVencidas: 2,
      totalContasMes: 17,
      totalValorContasPagas: 550.79,
      totalValorContasPendentes: 1500.50,
      totalValorContasVencidas: 200.00,
      totalContasNextMonth: 5,
      totalValorContasNextMonth: 800.00,
      timestamp: new Date().toISOString()
    };

    console.log('🚀 DASHBOARD TESTE RESPONSE ENVIADA!');
    res.json(testData);
    
  } catch (error) {
    console.error('❌ ERRO NO DASHBOARD TESTE:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
