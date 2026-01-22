const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');
const ContaBancaria = require('./models/ContaBancaria');
const Extrato = require('./models/Extrato');

// Teste completo para encontrar o erro 500
const testDashboardCompleto = async () => {
  try {
    console.log('🔍 Iniciando teste completo do dashboard...');
    
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
    
    // Testar cada parte individualmente para encontrar o erro
    
    console.log('\n1️⃣ Testando dados básicos...');
    const baseFilter = { usuario: new mongoose.Types.ObjectId(usuarioId) };
    
    const totalContasPagar = await Conta.countDocuments({
      ...baseFilter,
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
    
    console.log('\n2️⃣ Testando relatório de formas de pagamento...');
    // 1. Agregar gastos por forma de pagamento
    const gastosPorForma = await Gasto.aggregate([
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
          quantidadeGastos: { $sum: 1 }
        }
      }
    ]);
    
    // 2. Agregar contas pagas por forma de pagamento
    const contasPorForma = await Conta.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          status: 'Pago',
          dataPagamento: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$formaPagamento',
          totalContas: { $sum: '$valor' },
          quantidadeContas: { $sum: 1 }
        }
      }
    ]);
    
    console.log(`   gastosPorForma: ${gastosPorForma.length} itens`);
    console.log(`   contasPorForma: ${contasPorForma.length} itens`);
    
    console.log('\n3️⃣ Testando getComparacaoMensal...');
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

      const getDadosMes = async (usuarioId, mes, ano) => {
        const startDate = new Date(ano, mes - 1, 1);
        const endDate = new Date(ano, mes, 0, 23, 59, 59);
        
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

        return {
          totalGastos,
          totalContas,
          total: totalGastos + totalContas
        };
      };

      const dadosAtuais = await getDadosMes(usuarioId, mesAtual, anoAtual);
      const dadosAnteriores = await getDadosMes(usuarioId, mesAnterior, anoAnterior);
      const dadosProximos = await getDadosMes(usuarioId, mesProximo, anoProximo);

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
    
    const comparacaoMensal = await getComparacaoMensal(usuarioId, mesAtual, anoAtual);
    console.log('   ✅ getComparacaoMensal funcionando');
    
    console.log('\n4️⃣ Testando getEvolucaoSaldo...');
    const getEvolucaoSaldo = async (usuarioId, mesAtual, anoAtual) => {
      try {
        console.log('   🔍 Calculando evolução do saldo...');
        
        // Buscar contas bancárias do usuário
        const contasBancarias = await ContaBancaria.find({ 
          usuario: new mongoose.Types.ObjectId(usuarioId) 
        });
        
        if (contasBancarias.length === 0) {
          console.log('   📭 Nenhuma conta bancária encontrada');
          return [];
        }
        
        // Gerar range de meses (últimos 6 meses)
        const monthsRange = [];
        for (let i = 5; i >= 0; i--) {
          const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
          const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
          monthsRange.push(refEnd);
        }
        
        console.log(`   📊 Analisando ${contasBancarias.length} contas em ${monthsRange.length} períodos`);
        
        // Para cada conta, calcular evolução do saldo
        const evolucaoSaldo = await Promise.all(
          contasBancarias.map(async (conta) => {
            const saldos = await Promise.all(
              monthsRange.map(async (monthEnd) => {
                // Buscar extratos até o final do mês
                const extratos = await Extrato.find({
                  contaBancaria: conta._id,
                  usuario: new mongoose.Types.ObjectId(usuarioId),
                  estornado: false,
                  data: { $lte: monthEnd }
                }).sort({ data: 1 });

                const saldo = extratos.reduce((acc, ext) => {
                  if (ext.tipo === 'Entrada' || ext.tipo === 'Saldo Inicial') return acc + ext.valor;
                  return acc - ext.valor;
                }, 0);

                return { 
                  data: monthEnd, 
                  saldo: parseFloat(saldo.toFixed(2)),
                  quantidadeTransacoes: extratos.length
                };
              })
            );

            return { 
              conta: conta.nome,
              banco: conta.banco,
              contaId: conta._id,
              saldos 
            };
          })
        );
        
        console.log('   ✅ Evolução do saldo calculada com sucesso');
        return evolucaoSaldo;
        
      } catch (error) {
        console.error('   ❌ Erro ao calcular evolução do saldo:', error);
        return [];
      }
    };
    
    const evolucaoSaldo = await getEvolucaoSaldo(usuarioId, mesAtual, anoAtual);
    console.log('   ✅ getEvolucaoSaldo funcionando');
    
    console.log('\n5️⃣ Testando relatório de tipos de despesa com subgrupos...');
    
    // Primeiro, buscar todos os grupos do usuário
    const grupos = await Grupo.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    console.log(`   Grupos encontrados: ${grupos.length}`);
    
    // Calcular total geral para percentuais
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
    
    const totalGeralDespesas = totalGeralResult[0]?.total || 0;
    console.log(`   Total geral de despesas: R$${totalGeralDespesas.toFixed(2)}`);
    
    // Para cada grupo, buscar gastos e processar subgrupos
    console.log('   Processando subgrupos...');
    const relatorioTiposDespesaDetalhado = await Promise.all(
      grupos.map(async (grupo, index) => {
        console.log(`   🔍 Processando grupo ${index + 1}: ${grupo.nome}`);
        
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
            percentualGrupo: totalGeralDespesas > 0 ? (totalGrupo / totalGeralDespesas) * 100 : 0,
            subgrupos: subgrupos
          };
          
        } catch (error) {
          console.error(`     ❌ Erro no grupo ${grupo.nome}:`, error.message);
          return null;
        }
      })
    );
    
    // Filtrar grupos sem gastos e ordenar
    const relatorioFiltrado = relatorioTiposDespesaDetalhado
      .filter(item => item !== null && item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);
    
    console.log(`   ✅ Relatório de tipos de despesa funcionando: ${relatorioFiltrado.length} grupos`);
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    console.log('\n🎉 Todos os testes concluídos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste completo:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testDashboardCompleto();
