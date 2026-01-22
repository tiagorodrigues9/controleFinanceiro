const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Extrato = require('./models/Extrato');
const ContaBancaria = require('./models/ContaBancaria');
const Grupo = require('./models/Grupo');

// Teste isolado do dashboard para encontrar o erro
const testDashboardErro = async () => {
  try {
    console.log('🔍 Iniciando teste do dashboard...');
    
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
    
    // Testar cada parte do dashboard individualmente
    
    console.log('\n1️⃣ Testando contas básicas...');
    const totalContasPagar = await Conta.countDocuments({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      status: { $in: ['Pendente', 'Vencida'] }
    });
    console.log(`   totalContasPagar: ${totalContasPagar}`);
    
    console.log('\n2️⃣ Testando gastos básicos...');
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
    
    console.log('\n3️⃣ Testando grupos...');
    const grupos = await Grupo.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    console.log(`   grupos encontrados: ${grupos.length}`);
    
    console.log('\n4️⃣ Testando relatório de formas de pagamento...');
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
    console.log(`   relatorioFormasPagamento: ${JSON.stringify(relatorioFormasPagamento)}`);
    
    console.log('\n5️⃣ Testando relatório de tipos de despesa (PARTE 1 - grupos)...');
    const totalGeralResult = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$valor' }
        }
      }
    ]);
    console.log(`   totalGeralResult: ${JSON.stringify(totalGeralResult)}`);
    
    console.log('\n6️⃣ Testando relatório de tipos de despesa (PARTE 2 - Promise.all)...');
    const relatorioTiposDespesaDetalhado = await Promise.all(
      grupos.map(async (grupo, index) => {
        console.log(`   Processando grupo ${index + 1}: ${grupo.nome}`);
        
        try {
          // Aggregate para buscar gastos do grupo com subgrupos
          const gastosGrupo = await Gasto.aggregate([
            {
              $match: {
                usuario: new mongoose.Types.ObjectId(usuarioId),
                'tipoDespesa.grupo': grupo._id,
                data: { $gte: startDate, $lte: endDate }
              }
            },
            {
              $group: {
                _id: '$tipoDespesa.subgrupo',
                valor: { $sum: '$valor' },
                quantidade: { $sum: 1 }
              }
            },
            {
              $sort: { valor: -1 }
            }
          ]);
          
          console.log(`     Gastos encontrados: ${gastosGrupo.length}`);
          
          // Se não houver gastos para este grupo, retornar null
          if (gastosGrupo.length === 0) {
            console.log(`     ❌ Nenhum gasto encontrado para este grupo`);
            return null;
          }
          
          // Calcular total do grupo
          const totalGrupo = gastosGrupo.reduce((acc, item) => acc + item.valor, 0);
          console.log(`     Total do grupo: R$${totalGrupo.toFixed(2)}`);
          
          // Processar subgrupos com percentuais
          const subgrupos = gastosGrupo.map(item => ({
            subgrupoNome: item._id || 'Não categorizado',
            valor: item.valor,
            quantidade: item.quantidade,
            percentualSubgrupo: totalGrupo > 0 ? (item.valor / totalGrupo) * 100 : 0
          }));
          
          return {
            grupoId: grupo._id,
            grupoNome: grupo.nome,
            totalGrupo: totalGrupo,
            quantidade: gastosGrupo.reduce((acc, item) => acc + item.quantidade, 0),
            percentualGrupo: totalGeralResult[0]?.total > 0 ? (totalGrupo / totalGeralResult[0].total) * 100 : 0,
            subgrupos: subgrupos
          };
          
        } catch (error) {
          console.error(`     ❌ Erro no grupo ${grupo.nome}:`, error.message);
          return null;
        }
      })
    );
    
    console.log('\n7️⃣ Filtrando e ordenando...');
    const relatorioFiltrado = relatorioTiposDespesaDetalhado
      .filter(item => item !== null && item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);
    
    console.log(`   relatorioFiltrado: ${relatorioFiltrado.length} grupos`);
    
    console.log('\n8️⃣ Testando getComparacaoMensal...');
    const getComparacaoMensal = async (usuarioId, mesAtual, anoAtual) => {
      const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

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

      console.log(`   Testando comparação: ${mesAnterior}/${anoAnterior} <-> ${mesAtual}/${anoAtual} <-> ${mesProximo}/${anoProximo}`);

      // Simplificado para teste - apenas retorna dados mock
      return [
        { mes: meses[mesAnterior - 1], totalGastos: 1000, totalContas: 500, total: 1500 },
        { mes: meses[mesAtual - 1], totalGastos: 1500, totalContas: 800, total: 2300 },
        { mes: meses[mesProximo - 1], totalGastos: 2000, totalContas: 600, total: 2600 }
      ];
    };
    
    const comparacaoMensal = await getComparacaoMensal(usuarioId, mesAtual, anoAtual);
    console.log(`   comparacaoMensal: ${JSON.stringify(comparacaoMensal)}`);
    
    console.log('\n9️⃣ Testando getEvolucaoSaldo...');
    const getEvolucaoSaldo = async (usuarioId, mesAtual, anoAtual) => {
      // Simplificado para teste - retorna dados mock
      return [
        {
          conta: 'Conta Teste',
          saldos: [
            { data: new Date('2025-08-31'), saldo: 1000 },
            { data: new Date('2025-09-30'), saldo: 1500 },
            { data: new Date('2025-10-31'), saldo: 1200 }
          ]
        }
      ];
    };
    
    const evolucaoSaldo = await getEvolucaoSaldo(usuarioId, mesAtual, anoAtual);
    console.log(`   evolucaoSaldo: ${JSON.stringify(evolucaoSaldo)}`);
    
    console.log('\n✅ Todos os testes concluídos com sucesso!');
    
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro no teste do dashboard:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testDashboardErro();
