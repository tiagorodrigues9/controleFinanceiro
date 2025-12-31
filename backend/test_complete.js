const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function criarUsuarioTeste() {
  try {
    console.log('=== Criando Usuário de Teste ===');
    
    // Tentar registrar usuário
    console.log('Registrando usuário...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      nome: 'Usuário Teste',
      email: 'test@example.com',
      password: '123456'
    });
    
    console.log('Usuário criado com sucesso!');
    console.log('Token:', registerResponse.data.token);
    
    // Agora testar as parcelas
    await testarExclusaoParcelas(registerResponse.data.token);
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.message?.includes('já existe')) {
      console.log('Usuário já existe, fazendo login...');
      try {
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          email: 'test@example.com',
          password: '123456'
        });
        console.log('Login realizado com sucesso!');
        await testarExclusaoParcelas(loginResponse.data.token);
      } catch (loginError) {
        console.error('Erro no login:', loginError.response?.data || loginError.message);
      }
    } else {
      console.error('Erro ao registrar:', error.response?.data || error.message);
    }
  }
}

async function testarExclusaoParcelas(token) {
  try {
    console.log('\n=== Testando Exclusão de Parcelas ===');
    
    // Configurar headers
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 1. Buscar contas existentes
    console.log('\n1. Buscando contas...');
    const contasResponse = await axios.get(`${API_URL}/contas`, { headers });
    const contas = contasResponse.data;
    
    console.log(`Encontradas ${contas.length} contas`);
    
    // 2. Procurar contas parceladas
    const contasParceladas = contas.filter(c => c.parcelaId && c.totalParcelas > 1);
    console.log(`Encontradas ${contasParceladas.length} contas parceladas`);
    
    if (contasParceladas.length === 0) {
      console.log('Nenhuma conta parcelada encontrada. Criando uma para teste...');
      
      // Criar fornecedor se necessário
      const fornecedoresResponse = await axios.get(`${API_URL}/fornecedores`, { headers });
      let fornecedor = fornecedoresResponse.data[0];
      
      if (!fornecedor) {
        console.log('Criando fornecedor...');
        const newFornecedor = await axios.post(`${API_URL}/fornecedores`, {
          nome: 'Fornecedor Teste',
          tipo: 'Serviços'
        }, { headers });
        fornecedor = newFornecedor.data;
      }
      
      // Criar conta parcelada
      console.log('Criando conta parcelada...');
      const novaConta = await axios.post(`${API_URL}/contas`, {
        nome: 'Conta Parcelada Teste',
        dataVencimento: '2025-01-15',
        valor: 300,
        fornecedor: fornecedor._id,
        totalParcelas: 5,
        parcelMode: 'dividir'
      }, { headers });
      
      console.log('Conta parcelada criada:', novaConta.data.length, 'parcelas');
      
      // Buscar novamente
      const contasResponse2 = await axios.get(`${API_URL}/contas`, { headers });
      const contasParceladas2 = contasResponse2.data.filter(c => c.parcelaId && c.totalParcelas > 1);
      
      if (contasParceladas2.length > 0) {
        await testarExclusao(contasParceladas2[0]._id, headers);
      }
    } else {
      // Testar com a primeira conta parcelada encontrada
      await testarExclusao(contasParceladas[0]._id, headers);
    }
    
  } catch (error) {
    console.error('Erro no teste:', error.response?.data || error.message);
  }
}

async function testarExclusao(contaId, headers) {
  try {
    console.log(`\n3. Testando exclusão da conta ${contaId}`);
    
    // Tentar excluir
    const deleteResponse = await axios.delete(`${API_URL}/contas/${contaId}`, { headers });
    
    console.log('Resposta da exclusão:', deleteResponse.data);
    
    if (deleteResponse.data.hasRemainingInstallments) {
      console.log('✅ Funcionalidade detectou parcelas restantes!');
      console.log(`Parcelas restantes: ${deleteResponse.data.remainingCount}`);
      
      // Testar cancelar todas
      console.log('\n4. Testando cancelar todas as parcelas...');
      const cancelAllResponse = await axios.delete(`${API_URL}/contas/${contaId}/cancel-all-remaining`, { headers });
      console.log('Resposta do cancelar todas:', cancelAllResponse.data);
    } else {
      console.log('❌ Não detectou parcelas restantes');
    }
    
  } catch (error) {
    console.error('Erro ao testar exclusão:', error.response?.data || error.message);
  }
}

criarUsuarioTeste();
