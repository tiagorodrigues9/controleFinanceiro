const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

// Teste simplificado do dashboard para encontrar o erro 500
const testDashboardSimples = async () => {
  try {
    console.log('🔍 Iniciando teste simplificado do dashboard...');
    
    // Conectar ao MongoDB
    const mongoUser = process.env.MONGO_USER || '';
    const mongoPass = process.env.MONGO_PASS || '';
    const mongoDb = process.env.MONGO_DB || 'controle-financeiro';
    const mongoHost = process.env.MONGO_HOST || '';

    let mongoUri;
    if (mongoUser && mongoPass && mongoHost) {
      const cleanHost = mongoHost.startsWith('@') ? mongoHost.substring(1) : mongoHost;
      mongoUri = `mongodb+srv://${mongoUser}:${encodeURIComponent(mongoPass)}@${cleanHost}/${mongoDb}?retryWrites=true&w=majority`;
    } else {
      mongoUri = `mongodb://localhost:27017/${mongoDb}`;
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri);
    }
    
    console.log('✅ Conectado ao MongoDB');
    
    // Dados de teste
    const usuarioId = '6956f5edca85096ad6c7d995';
    const mesAtual = 1;
    const anoAtual = 2026;
    
    const startDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01T12:00:00.000Z`);
    const endDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-31T12:00:00.000Z`);
    
    console.log('📅 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // Testar apenas os dados básicos que podem causar erro 500
    console.log('\n1️⃣ Testando dados básicos...');
    
    const totalContasPagar = await Conta.countDocuments({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      status: { $in: ['Pendente', 'Vencida'] }
    });
    console.log(`   totalContasPagar: ${totalContasPagar}`);
    
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    console.log(`   gastosMes: ${JSON.stringify(gastosMes)}`);
    
    const extratoMes = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$tipo",
          total: { $sum: "$valor" }
        }
      }
    ]);
    console.log(`   extratoMes: ${JSON.stringify(extratoMes)}`);
    
    // Testar relatório de formas de pagamento
    console.log('\n2️⃣ Testando formas de pagamento...');
    const relatorioFormasPagamento = await Gasto.aggregate([
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
    console.log(`   relatorioFormasPagamento: ${relatorioFormasPagamento.length} itens`);
    
    // Testar relatório de cartões
    console.log('\n3️⃣ Testando relatório de cartões...');
    const relatorioCartoes = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          cartaoId: { $exists: true, $ne: null },
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$cartaoId',
          totalGastos: { $sum: '$valor' },
          quantidadeGastos: { $sum: 1 }
        }
      }
    ]);
    console.log(`   relatorioCartoes: ${relatorioCartoes.length} itens`);
    
    // Testar comparação básica
    console.log('\n4️⃣ Testando comparação básica...');
    const comparacaoMeses = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGastos: { $sum: '$valor' },
          quantidadeGastos: { $sum: 1 }
        }
      }
    ]);
    console.log(`   comparacaoMeses: ${JSON.stringify(comparacaoMeses)}`);
    
    const comparacaoContas = await Conta.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          dataPagamento: { $gte: startDate, $lte: endDate },
          status: 'Pago'
        }
      },
      {
        $group: {
          _id: null,
          totalContas: { $sum: '$valor' },
          quantidadeContas: { $sum: 1 }
        }
      }
    ]);
    console.log(`   comparacaoContas: ${JSON.stringify(comparacaoContas)}`);
    
    // Montar resposta simplificada para testar
    console.log('\n5️⃣ Montando resposta simplificada...');
    
    const dashboardDataSimples = {
      periodo: {
        mes: mesAtual,
        ano: anoAtual
      },
      contas: {
        totalPagar: totalContasPagar,
        valorPagarMes: 0,
        pagasMes: 0,
        valorPagasMes: 0
      },
      financeiro: {
        saldoTotal: 0,
        totalContasBancarias: 0,
        totalGastosMes: (gastosMes && gastosMes[0]) ? gastosMes[0].total : 0,
        totalEntradasMes: 0,
        totalSaidasMes: 0,
        saldoMes: 0
      },
      totalGastosMes: (gastosMes && gastosMes[0]) ? gastosMes[0].total : 0,
      totalEntradasMes: 0,
      totalSaidasMes: 0,
      saldoMes: 0,
      totalContasPagar: totalContasPagar || 0,
      totalValorContasPagarMes: 0,
      totalContasPendentesMes: totalContasPagar || 0,
      totalContasPagas: 0,
      totalContasVencidas: 0,
      totalContasMes: totalContasPagar || 0,
      totalValorContasPagas: 0,
      totalValorContasPendentes: 0,
      totalValorContasVencidas: 0,
      totalContasNextMonth: 0,
      totalValorContasNextMonth: 0,
      
      relatorioFormasPagamento: relatorioFormasPagamento.map(item => ({
        formaPagamento: item._id || 'Não informado',
        totalGastos: item.totalGastos || 0,
        totalContas: 0,
        totalGeral: item.totalGastos || 0,
        quantidadeGastos: item.quantidade || 0,
        quantidadeContas: 0,
        quantidadeTotal: item.quantidade || 0,
        percentualGeral: 0
      })),
      
      relatorioTiposDespesa: [],  // Temporariamente vazio
      
      relatorioCartoes: relatorioCartoes.map(item => ({
        cartaoId: item._id,
        nome: 'Cartão ' + (item._id || 'Sem Nome'),
        totalGeral: item.totalGastos || 0,
        totalGastos: item.totalGastos || 0,
        quantidadeGastos: item.quantidadeGastos || 0,
        totalContas: 0,
        quantidadeContas: 0
      })),
      
      mesesComparacao: {
        totalGastos: (comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].totalGastos : 0,
        quantidadeGastos: (comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].quantidadeGastos : 0,
        totalContas: (comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].totalContas : 0,
        quantidadeContas: (comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].quantidadeContas : 0,
        totalGeral: ((comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].totalGastos : 0) + ((comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].totalContas : 0),
        saldo: ((comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].totalContas : 0) - ((comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].totalGastos : 0),
        comparacaoMensal: []
      },
      
      graficoBarrasTiposDespesa: [],
      evolucaoSaldo: [],
      
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Dashboard simplificado montado com sucesso!');
    console.log('📊 Estrutura final:');
    console.log(JSON.stringify(dashboardDataSimples, null, 2));
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro no teste simplificado:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testDashboardSimples();
