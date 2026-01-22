const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Importar o dashboard melhorado
const dashboardHandler = require('./api/dashboard-melhorado.js');

const test = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');

    // Criar um token de teste
    const token = jwt.sign(
      { id: '6956f5edca85096ad6c7d995', email: 'test@example.com' },
      process.env.JWT_SECRET || 'seu_jwt_secret_aqui'
    );

    // Criar um mock de request/response
    const req = {
      method: 'GET',
      url: '/api/dashboard?mes=1&ano=2026',
      headers: {
        authorization: `Bearer ${token}`
      }
    };

    let responseData = null;
    let statusCode = null;

    const res = {
      setHeader: (name, value) => console.log(`📋 Header: ${name} = ${value}`),
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
            console.log(`📤 Status: ${code}`);
          }
        };
      },
      json: (data) => {
        responseData = data;
        console.log('📤 Response JSON enviado');
      },
      end: () => console.log('📤 Response finalizada')
    };

    // Executar o handler
    await dashboardHandler(req, res);

    if (responseData) {
      console.log('\n🎯 ANÁLISE DO RELATÓRIO DE COMPARAÇÃO DE MESES:');
      console.log('='.repeat(60));
      
      if (responseData.comparacaoMeses && responseData.comparacaoMeses.comparacaoMensal) {
        const comparacao = responseData.comparacaoMeses.comparacaoMensal;
        
        console.log('\n📊 ESTRUTURA DO RELATÓRIO:');
        console.log(JSON.stringify(comparacao, null, 2));
        
        console.log('\n📈 ANÁLISE MÊS A MÊS:');
        comparacao.forEach((mes, index) => {
          const tipo = index === 0 ? 'ANTERIOR' : index === 1 ? 'ATUAL' : 'PRÓXIMO';
          console.log(`\n${tipo} - ${mes.mes}/${mes.ano}:`);
          console.log(`  💰 Gastos: R$${mes.totalGastos.toFixed(2)}`);
          console.log(`  📄 Contas: R$${mes.totalContas.toFixed(2)}`);
          console.log(`  📊 Total: R$${mes.total.toFixed(2)}`);
          console.log(`  📈 Saldo: R$${mes.saldo.toFixed(2)}`);
          console.log(`  📦 Qtd Gastos: ${mes.quantidadeGastos}`);
          console.log(`  📦 Qtd Contas: ${mes.quantidadeContas}`);
        });

        console.log('\n✅ VALIDAÇÃO DA ESTRUTURA:');
        console.log('✅ Tem 3 meses:', comparacao.length === 3 ? 'SIM' : 'NÃO');
        console.log('✅ Ordem correta (Anterior, Atual, Próximo):', 
          comparacao[0].mesNumero < comparacao[1].mesNumero || 
          (comparacao[0].mesNumero > comparacao[1].mesNumero && comparacao[0].ano < comparacao[1].ano) ? 'SIM' : 'NÃO');
        
        // Verificar se os dados do mês atual batem com o resumo
        const mesAtual = comparacao[1];
        const resumoMes = responseData.resumoMes;
        
        console.log('\n🔍 CONSISTÊNCIA DOS DADOS:');
        console.log(`Gastos mês atual (comparação): R$${mesAtual.totalGastos.toFixed(2)}`);
        console.log(`Gastos mês atual (resumo): R$${resumoMes.totalGastosMes.toFixed(2)}`);
        console.log('✅ Gastos consistentes:', Math.abs(mesAtual.totalGastos - resumoMes.totalGastosMes) < 0.01 ? 'SIM' : 'NÃO');
        
      } else {
        console.log('❌ Estrutura comparacaoMeses não encontrada');
      }
    } else {
      console.log('❌ Nenhuma resposta recebida');
    }

    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    await mongoose.disconnect();
  }
};

test();
