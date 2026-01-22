const axios = require('axios');

async function testFullResponse() {
  try {
    // Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'tr364634@gmail.com',
      password: '194850Actdf!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado');
    
    // Testar dashboard
    console.log('\n📊 Testando dashboard completo...');
    const dashboardResponse = await axios.get('http://localhost:5000/api/dashboard?mes=1&ano=2026', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n📋 ESTRUTURA COMPLETA DA RESPOSTA:');
    console.log('Keys disponíveis:', Object.keys(dashboardResponse.data));
    
    console.log('\n💰 DADOS FINANCEIROS:');
    if (dashboardResponse.data.financeiro) {
      console.log('financeiro.saldoTotal:', dashboardResponse.data.financeiro.saldoTotal);
      console.log('financeiro.totalGastosMes:', dashboardResponse.data.financeiro.totalGastosMes);
      console.log('financeiro.totalEntradasMes:', dashboardResponse.data.financeiro.totalEntradasMes);
      console.log('financeiro.totalSaidasMes:', dashboardResponse.data.financeiro.totalSaidasMes);
      console.log('financeiro.saldoMes:', dashboardResponse.data.financeiro.saldoMes);
    } else {
      console.log('❌ Campo financeiro não encontrado');
    }
    
    console.log('\n📄 DADOS DE CONTAS:');
    console.log('totalContasPagar:', dashboardResponse.data.totalContasPagar);
    console.log('totalValorContasPagarMes:', dashboardResponse.data.totalValorContasPagarMes);
    console.log('totalContasPagas:', dashboardResponse.data.totalContasPagas);
    console.log('totalValorContasPagas:', dashboardResponse.data.totalValorContasPagas);
    
    console.log('\n📊 GASTOS E EXTRATOS:');
    console.log('totalGastosMes (no root):', dashboardResponse.data.totalGastosMes);
    console.log('totalEntradasMes (no root):', dashboardResponse.data.totalEntradasMes);
    console.log('totalSaidasMes (no root):', dashboardResponse.data.totalSaidasMes);
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testFullResponse();
