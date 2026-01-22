const axios = require('axios');

async function testContasBancarias() {
  try {
    // Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'tr364634@gmail.com',
      password: '194850Actdf!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login realizado');
    
    // Testar contas bancárias
    console.log('\n🏦 Testando contas bancárias...');
    const response = await axios.get('http://localhost:5000/api/contas-bancarias', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Resposta da API:');
    console.log('Total de contas:', response.data.length);
    response.data.forEach((conta, index) => {
      console.log(`${index + 1}. ${conta.nome || 'Sem nome'}`);
      console.log(`   Saldo: R$ ${conta.saldo || 0}`);
      console.log(`   Banco: ${conta.banco || 'Não informado'}`);
      console.log(`   Tipo: ${conta.tipo || 'Não informado'}`);
      console.log('');
    });
    
    // Testar extrato
    console.log('\n📋 Testando extrato...');
    const extratoResponse = await axios.get('http://localhost:5000/api/extrato', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Estrutura da resposta:', typeof extratoResponse.data);
    console.log('Chaves:', Object.keys(extratoResponse.data));
    
    if (extratoResponse.data.extratos) {
      console.log('Total de extratos:', extratoResponse.data.extratos.length);
      console.log('Total Saldo:', extratoResponse.data.totalSaldo);
      console.log('Total Entradas:', extratoResponse.data.totalEntradas);
      console.log('Total Saídas:', extratoResponse.data.totalSaidas);
      
      if (extratoResponse.data.extratos.length > 0) {
        console.log('Primeiros 5 extratos:');
        extratoResponse.data.extratos.slice(0, 5).forEach((item, index) => {
          console.log(`${index + 1}. ${item.motivo} - R$ ${item.valor} (${item.tipo})`);
        });
      }
    } else {
      console.log('❌ Nenhum extrato encontrado');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testContasBancarias();
