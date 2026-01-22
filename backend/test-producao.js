const axios = require('axios');

async function testProducao() {
  try {
    console.log('🔐 Testando API de Produção...');
    
    // URL de produção
    const BASE_URL = 'https://controlefinanceiro-i7s6.onrender.com/api';
    
    // Fazer login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'tr364634@gmail.com',
      password: '194850Actdf!'
    });
    
    console.log('✅ Login realizado com sucesso');
    console.log('Token:', loginResponse.data.token ? loginResponse.data.token.substring(0, 50) + '...' : 'Token não encontrado');
    
    // Testar dashboard
    console.log('\n📊 Testando Dashboard de Produção...');
    const dashboardResponse = await axios.get(`${BASE_URL}/dashboard?mes=1&ano=2026`, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ Dashboard Response:');
    console.log('  Total Contas a Pagar:', dashboardResponse.data.totalContasPagar);
    console.log('  Total Gastos Mês:', dashboardResponse.data.totalGastosMes);
    console.log('  Total Entradas Mês:', dashboardResponse.data.totalEntradasMes);
    console.log('  Total Saídas Mês:', dashboardResponse.data.totalSaidasMes);
    console.log('  Saldo Mês:', dashboardResponse.data.saldoMes);
    
    // Verificar estrutura completa
    console.log('\n📋 Estrutura completa da resposta:');
    console.log('  Chaves:', Object.keys(dashboardResponse.data));
    
    if (dashboardResponse.data.financeiro) {
      console.log('  Financeiro:', dashboardResponse.data.financeiro);
    }
    
    // Testar contas bancárias
    console.log('\n🏦 Testando Contas Bancárias...');
    const contasResponse = await axios.get(`${BASE_URL}/contas-bancarias`, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ Contas Bancárias:');
    console.log('  Total:', contasResponse.data.length);
    contasResponse.data.forEach((conta, index) => {
      console.log(`  ${index + 1}. ${conta.nome}: R$ ${conta.saldo}`);
    });
    
    // Testar extrato
    console.log('\n📋 Testando Extrato...');
    const extratoResponse = await axios.get(`${BASE_URL}/extrato`, {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ Extrato:');
    console.log('  Total lançamentos:', extratoResponse.data.extratos.length);
    console.log('  Total Saldo:', extratoResponse.data.totalSaldo);
    console.log('  Total Entradas:', extratoResponse.data.totalEntradas);
    console.log('  Total Saídas:', extratoResponse.data.totalSaidas);
    
  } catch (error) {
    console.error('❌ Erro na API de Produção:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testProducao();
