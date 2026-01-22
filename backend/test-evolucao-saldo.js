const mongoose = require('mongoose');
const ContaBancaria = require('./models/ContaBancaria');
const Extrato = require('./models/Extrato');

const testEvolucaoSaldo = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');
    
    const usuarioId = '6956f5edca85096ad6c7d995';
    const mesAtual = 1; // Janeiro
    const anoAtual = 2026;
    
    console.log('🔍 Testando evolução do saldo para', mesAtual, '/', anoAtual);
    
    // 1. Verificar contas bancárias do usuário
    console.log('\n🏦 Contas bancárias do usuário:');
    const contasBancarias = await ContaBancaria.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    contasBancarias.forEach((conta, index) => {
      console.log(`${index + 1}. ${conta.nome} (${conta.banco}) - Saldo: R$${conta.saldo.toFixed(2)}`);
    });
    
    if (contasBancarias.length === 0) {
      console.log('❌ Nenhuma conta bancária encontrada');
      await mongoose.disconnect();
      return;
    }
    
    // 2. Gerar range de meses (últimos 6 meses)
    const monthsRange = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
      const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
      monthsRange.push(refEnd);
    }
    
    console.log('\n📅 Períodos analisados:');
    monthsRange.forEach((date, index) => {
      console.log(`${index + 1}. ${date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
    });
    
    // 3. Para cada conta, calcular evolução do saldo
    console.log('\n📈 Calculando evolução do saldo:');
    
    const evolucaoSaldo = await Promise.all(
      contasBancarias.map(async (conta) => {
        console.log(`\n💳 Conta: ${conta.nome}`);
        
        const saldos = await Promise.all(
          monthsRange.map(async (monthEnd) => {
            const extratos = await Extrato.find({
              contaBancaria: conta._id,
              usuario: new mongoose.Types.ObjectId(usuarioId),
              estornado: false,
              data: { $lte: monthEnd }
            });

            const saldo = extratos.reduce((acc, ext) => {
              if (ext.tipo === 'Entrada' || ext.tipo === 'Saldo Inicial') return acc + ext.valor;
              return acc - ext.valor;
            }, 0);

            return { data: monthEnd, saldo };
          })
        );

        // Exibir evolução da conta
        saldos.forEach((saldoItem, index) => {
          const mes = saldoItem.data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
          console.log(`  ${mes}: R$${saldoItem.saldo.toFixed(2)}`);
        });

        return { conta: conta.nome, saldos };
      })
    );
    
    // 4. Estrutura final do relatório
    console.log('\n📊 Estrutura final do relatório:');
    console.log(JSON.stringify(evolucaoSaldo, null, 2));
    
    // 5. Análise de performance
    console.log('\n⚡ Análise de Performance:');
    console.log(`- Contas processadas: ${contasBancarias.length}`);
    console.log(`- Períodos analisados: ${monthsRange.length}`);
    console.log(`- Total de queries: ${contasBancarias.length * monthsRange.length}`);
    
    // 6. Verificar dados de exemplo
    if (evolucaoSaldo.length > 0 && evolucaoSaldo[0].saldos.length > 0) {
      const primeiraConta = evolucaoSaldo[0];
      const primeiroSaldo = primeiraConta.saldos[0];
      
      console.log('\n🔍 Validação dos dados:');
      console.log(`✅ Tem nome da conta: ${primeiraConta.conta ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem array de saldos: ${Array.isArray(primeiraConta.saldos) ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Saldo é número: ${typeof primeiroSaldo.saldo === 'number' ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Data é objeto Date: ${primeiroSaldo.data instanceof Date ? 'SIM' : 'NÃO'}`);
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.disconnect();
  }
};

testEvolucaoSaldo();
