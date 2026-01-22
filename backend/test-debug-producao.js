const axios = require('axios');

async function testDebugProducao() {
  try {
    console.log('🔍 Testando Debug de Produção...');
    
    // Testar diferentes endpoints
    const BASE_URL = 'https://controlefinanceiro-i7s6.onrender.com/api';
    
    // 1. Testar endpoint raiz
    console.log('\n📋 Testando endpoint raiz...');
    try {
      const rootResponse = await axios.get(`${BASE_URL}/`);
      console.log('✅ Root Response:', rootResponse.data);
    } catch (error) {
      console.log('❌ Root Error:', error.response?.status, error.response?.data);
    }
    
    // 2. Testar health
    console.log('\n🏥 Testando health...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health Response:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health Error:', error.response?.status, error.response?.data);
    }
    
    // 3. Testar login com debug
    console.log('\n🔐 Testando login com debug...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'tr364634@gmail.com',
        password: '194850Actdf!'
      });
      
      console.log('✅ Login Status:', loginResponse.status);
      console.log('✅ Login Headers:', loginResponse.headers);
      console.log('✅ Login Data:', loginResponse.data);
      
      if (loginResponse.data.token) {
        console.log('✅ Token encontrado:', loginResponse.data.token.substring(0, 50) + '...');
        
        // 4. Testar dashboard
        console.log('\n📊 Testando dashboard...');
        const dashboardResponse = await axios.get(`${BASE_URL}/dashboard?mes=1&ano=2026`, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`
          }
        });
        
        console.log('✅ Dashboard Status:', dashboardResponse.status);
        console.log('✅ Dashboard Data:', dashboardResponse.data);
        
      } else {
        console.log('❌ Token não encontrado na resposta');
      }
      
    } catch (error) {
      console.log('❌ Login Error:');
      console.log('  Status:', error.response?.status);
      console.log('  Data:', error.response?.data);
      console.log('  Headers:', error.response?.headers);
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testDebugProducao();
