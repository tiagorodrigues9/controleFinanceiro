const axios = require('axios');

async function testRealUser() {
  try {
    // Fazer login com o usuário real
    console.log('🔐 Fazendo login com tr364634@gmail.com...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'tr364634@gmail.com',
      password: '194850Actdf!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado');
    console.log('User ID:', loginResponse.data.user.id);
    
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
    console.log('Total Contas Vencidas:', dashboardResponse.data.totalContasVencidas);
    console.log('Total Gastos Mês:', dashboardResponse.data.totalGastosMes || 'Não disponível');
    console.log('Total Entradas Mês:', dashboardResponse.data.totalEntradasMes || 'Não disponível');
    console.log('Total Saídas Mês:', dashboardResponse.data.totalSaidasMes || 'Não disponível');
    
  } catch (error) {
    console.error('❌ Erro na API:', error.response?.data || error.message);
  }
}

testRealUser();
