const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');
const Conta = require('./models/Conta');
const FormaPagamento = require('./models/FormaPagamento');

const testFormasPagamento = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');
    
    const usuarioId = '6956f5edca85096ad6c7d995';
    const startDate = new Date(2026, 0, 1); // Janeiro 2026
    const endDate = new Date(2026, 1, 0, 23, 59, 59); // Final Janeiro 2026
    
    console.log('🔍 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // 1. Verificar formas de pagamento cadastradas
    console.log('\n💳 Formas de pagamento cadastradas:');
    const formasPagamento = await FormaPagamento.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    formasPagamento.forEach((forma, index) => {
      console.log(`${index + 1}. ID: ${forma._id} | Nome: "${forma.nome}" | Ativo: ${forma.ativo}`);
    });
    
    // 2. Verificar estrutura dos gastos
    console.log('\n💰 Estrutura dos gastos (formaPagamento):');
    const gastosExemplo = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    }).limit(5);
    
    gastosExemplo.forEach((gasto, index) => {
      console.log(`Gasto ${index + 1}:`);
      console.log(`  ID: ${gasto._id}`);
      console.log(`  Valor: R$${gasto.valor}`);
      console.log(`  formaPagamento: "${gasto.formaPagamento}" (tipo: ${typeof gasto.formaPagamento})`);
      console.log('---');
    });
    
    // 3. Verificar estrutura das contas
    console.log('\n📄 Estrutura das contas (formaPagamento):');
    const contasExemplo = await Conta.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      dataPagamento: { $gte: startDate, $lte: endDate },
      status: 'Pago'
    }).limit(3);
    
    contasExemplo.forEach((conta, index) => {
      console.log(`Conta ${index + 1}:`);
      console.log(`  ID: ${conta._id}`);
      console.log(`  Valor: R$${conta.valor}`);
      console.log(`  formaPagamento: "${conta.formaPagamento}" (tipo: ${typeof conta.formaPagamento})`);
      console.log('---');
    });
    
    // 4. Testar aggregate do api/dashboard.js
    console.log('\n📊 Testando aggregate do api/dashboard.js:');
    const relatorioFormasPagamentoAPI = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$formaPagamento',
          totalGastos: { $sum: '$valor' },
          quantidade: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Resultado do aggregate (api/dashboard.js):');
    console.log(JSON.stringify(relatorioFormasPagamentoAPI, null, 2));
    
    // 5. Testar lógica do routes/dashboard.js
    console.log('\n📊 Testando lógica do routes/dashboard.js:');
    
    // Buscar todos os gastos e contas do período
    const gastos = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    });
    
    const contasPagasFormas = await Conta.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      status: 'Pago',
      dataPagamento: { $gte: startDate, $lte: endDate }
    });
    
    console.log(`Total de gastos: ${gastos.length}`);
    console.log(`Total de contas pagas: ${contasPagasFormas.length}`);
    
    // Processar como no routes/dashboard.js
    const gastosPorFormaPagamento = {};
    const contasPorFormaPagamento = {};

    gastos.forEach(gasto => {
      const formaPagamento = gasto.formaPagamento || 'Não informado';
      const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
      gastosPorFormaPagamento[formaPagamento] = (gastosPorFormaPagamento[formaPagamento] || 0) + valorGasto;
    });

    contasPagasFormas.forEach(conta => {
      const formaPagamento = conta.formaPagamento || 'Não informado';
      const valorConta = Math.round(parseFloat(conta.valor) * 100) / 100 + (conta.jurosPago || 0);
      contasPorFormaPagamento[formaPagamento] = (contasPorFormaPagamento[formaPagamento] || 0) + valorConta;
    });

    const relatorioFormasPagamentoRoutes = [];
    const todasFormas = new Set([...Object.keys(gastosPorFormaPagamento), ...Object.keys(contasPorFormaPagamento)]);

    todasFormas.forEach(forma => {
      const totalGastos = gastosPorFormaPagamento[forma] || 0;
      const totalContas = contasPorFormaPagamento[forma] || 0;
      const totalGeral = totalGastos + totalContas;
      
      if (totalGeral > 0) {
        relatorioFormasPagamentoRoutes.push({
          formaPagamento: forma,
          totalGastos: totalGastos,
          totalContas: totalContas,
          totalGeral: totalGeral,
          percentualGeral: totalGeral > 0 ? (totalGeral / (totalGastos + Object.values(contasPorFormaPagamento).reduce((a, b) => a + b, 0) + Object.values(gastosPorFormaPagamento).reduce((a, b) => a + b, 0))) * 100 : 0
        });
      }
    });

    relatorioFormasPagamentoRoutes.sort((a, b) => b.totalGeral - a.totalGeral);
    
    console.log('Resultado (routes/dashboard.js):');
    console.log(JSON.stringify(relatorioFormasPagamentoRoutes, null, 2));
    
    // 6. Comparação entre as duas abordagens
    console.log('\n🔍 Comparação entre api/dashboard.js e routes/dashboard.js:');
    console.log(`API (apenas gastos): ${relatorioFormasPagamentoAPI.length} formas`);
    console.log(`Routes (gastos + contas): ${relatorioFormasPagamentoRoutes.length} formas`);
    
    // 7. Validar estrutura esperada pelo frontend
    console.log('\n✅ Validação da estrutura:');
    if (relatorioFormasPagamentoRoutes.length > 0) {
      const primeiro = relatorioFormasPagamentoRoutes[0];
      console.log(`✅ Tem formaPagamento: ${primeiro.formaPagamento ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem totalGastos: ${typeof primeiro.totalGastos === 'number' ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem totalContas: ${typeof primeiro.totalContas === 'number' ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem totalGeral: ${typeof primeiro.totalGeral === 'number' ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem percentualGeral: ${typeof primeiro.percentualGeral === 'number' ? 'SIM' : 'NÃO'}`);
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.disconnect();
  }
};

testFormasPagamento();
