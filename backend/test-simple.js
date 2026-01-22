const axios = require('axios');

async function simpleTest() {
  try {
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'tr364634@gmail.com',
      password: '194850Actdf!'
    });
    
    const response = await axios.get('http://localhost:5000/api/dashboard?mes=1&ano=2026', {
      headers: {
        'Authorization': `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('✅ Success!');
    console.log('totalGastosMes:', response.data.totalGastosMes);
    console.log('totalEntradasMes:', response.data.totalEntradasMes);
    console.log('totalSaidasMes:', response.data.totalSaidasMes);
    console.log('financeiro.totalGastosMes:', response.data.financeiro?.totalGastosMes);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

simpleTest();
