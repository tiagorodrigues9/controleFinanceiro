const mongoose = require('mongoose');
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');

// Testar a função getDadosMes
const getDadosMes = async (usuarioId, mes, ano) => {
  const startDate = new Date(ano, mes - 1, 1);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);
  
  console.log('📅 Período:', startDate.toISOString(), 'a', endDate.toISOString());
  
  const gastosMes = await Gasto.aggregate([
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

  const contasMes = await Conta.aggregate([
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

  const totalGastos = gastosMes[0]?.totalGastos || 0;
  const totalContas = contasMes[0]?.totalContas || 0;

  console.log('💰 Gastos:', totalGastos, 'Contas:', totalContas);
  return { totalGastos, totalContas, total: totalGastos + totalContas };
};

// Função para obter comparação de 3 meses
const getComparacaoMensal = async (usuarioId, mesAtual, anoAtual) => {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Calcular mês anterior e próximo
  let mesAnterior = mesAtual - 1;
  let mesProximo = mesAtual + 1;
  let anoAnterior = anoAtual;
  let anoProximo = anoAtual;

  if (mesAnterior === 0) {
    mesAnterior = 12;
    anoAnterior = anoAtual - 1;
  }

  if (mesProximo === 13) {
    mesProximo = 1;
    anoProximo = anoAtual + 1;
  }

  console.log('\n🔍 Análise de 3 meses:');
  console.log('Mês Anterior:', mesAnterior, '/', anoAnterior);
  console.log('Mês Atual:', mesAtual, '/', anoAtual);
  console.log('Próximo Mês:', mesProximo, '/', anoProximo);

  // Dados dinâmicos baseados no mês atual
  const dadosAtuais = await getDadosMes(usuarioId, mesAtual, anoAtual);
  const dadosAnteriores = await getDadosMes(usuarioId, mesAnterior, anoAnterior);
  const dadosProximos = await getDadosMes(usuarioId, mesProximo, anoProximo);

  // Ordem correta: ANTERIOR, ATUAL, PRÓXIMO
  return [
    {
      mes: meses[mesAnterior - 1],
      totalGastos: dadosAnteriores.totalGastos,
      totalContas: dadosAnteriores.totalContas,
      total: dadosAnteriores.total
    },
    {
      mes: meses[mesAtual - 1],
      totalGastos: dadosAtuais.totalGastos,
      totalContas: dadosAtuais.totalContas,
      total: dadosAtuais.total
    },
    {
      mes: meses[mesProximo - 1],
      totalGastos: dadosProximos.totalGastos,
      totalContas: dadosProximos.totalContas,
      total: dadosProximos.total
    }
  ];
};

const test = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');
    
    const usuarioId = '6956f5edca85096ad6c7d995';
    const mesAtual = 1; // Janeiro
    const anoAtual = 2026;
    
    console.log(`🔍 Testando comparação para ${mesAtual}/${anoAtual}:`);
    
    const resultado = await getComparacaoMensal(usuarioId, mesAtual, anoAtual);
    
    console.log('\n📊 Resultado Final:');
    console.log(JSON.stringify(resultado, null, 2));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

test();
