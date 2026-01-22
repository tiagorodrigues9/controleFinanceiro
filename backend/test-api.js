const axios = require('axios');

async function testAPI() {
  try {
    // Fazer login direto
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@dashboard.com',
      password: '123456'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado, token obtido');
    
    // Testar dashboard com mês 1 e ano 2026
    console.log('\n📊 Testando dashboard com mês=1&ano=2026...');
    const dashboardResponse = await axios.get('http://localhost:5000/api/dashboard?mes=1&ano=2026', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Resposta da API:');
    console.log('Total Contas a Pagar:', dashboardResponse.data.totalContasPagar);
    console.log('Valor Contas Pagar Mês:', dashboardResponse.data.totalValorContasPagarMes);
    console.log('Total Contas Pagas:', dashboardResponse.data.totalContasPagas);
    console.log('Valor Contas Pagas Mês:', dashboardResponse.data.totalValorContasPagas);
    console.log('Total Gastos Mês:', dashboardResponse.data.totalGastosMes || 'Não disponível');
    
  } catch (error) {
    console.error('❌ Erro na API:', error.response?.data || error.message);
  }
}

testAPI();
