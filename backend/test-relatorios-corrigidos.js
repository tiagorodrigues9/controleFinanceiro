const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');
const ContaBancaria = require('./models/ContaBancaria');
const Extrato = require('./models/Extrato');

// Teste dos relatórios corrigidos
const testRelatoriosCorrigidos = async () => {
  try {
    console.log('🔍 Iniciando teste dos relatórios corrigidos...');
    
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
    
    // 1. Testar getComparacaoMensal
    console.log('\n1️⃣ Testando getComparacaoMensal...');
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
    console.log(`   Dados: ${JSON.stringify(comparacaoMensal, null, 2)}`);
    
    // 2. Testar getEvolucaoSaldo
    console.log('\n2️⃣ Testando getEvolucaoSaldo...');
    const getEvolucaoSaldo = async (usuarioId, mesAtual, anoAtual) => {
      try {
        console.log('🔍 Calculando evolução do saldo...');
        
        // Buscar contas bancárias do usuário
        const contasBancarias = await ContaBancaria.find({ 
          usuario: new mongoose.Types.ObjectId(usuarioId) 
        });
        
        if (contasBancarias.length === 0) {
          console.log('📭 Nenhuma conta bancária encontrada');
          return [];
        }
        
        // Gerar range de meses (últimos 6 meses)
        const monthsRange = [];
        for (let i = 5; i >= 0; i--) {
          const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
          const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
          monthsRange.push(refEnd);
        }
        
        console.log(`📊 Analisando ${contasBancarias.length} contas em ${monthsRange.length} períodos`);
        
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
        
        console.log('✅ Evolução do saldo calculada com sucesso');
        return evolucaoSaldo;
        
      } catch (error) {
        console.error('❌ Erro ao calcular evolução do saldo:', error);
        return [];
      }
    };
    
    const evolucaoSaldo = await getEvolucaoSaldo(usuarioId, mesAtual, anoAtual);
    console.log('   ✅ getEvolucaoSaldo funcionando');
    console.log(`   Contas: ${evolucaoSaldo.length}`);
    
    // 3. Testar relatório de formas de pagamento completo
    console.log('\n3️⃣ Testando relatório completo de formas de pagamento...');
    
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
    
    console.log(`   Gastos por forma: ${gastosPorForma.length} itens`);
    console.log(`   Contas por forma: ${contasPorForma.length} itens`);
    
    // 3. Combinar resultados
    const dadosCombinados = {};
    
    // Adicionar dados dos gastos
    gastosPorForma.forEach(item => {
      const forma = item._id || 'Não informado';
      dadosCombinados[forma] = {
        formaPagamento: forma,
        totalGastos: item.totalGastos || 0,
        quantidadeGastos: item.quantidadeGastos || 0,
        totalContas: 0,
        quantidadeContas: 0
      };
    });
    
    // Adicionar dados das contas
    contasPorForma.forEach(item => {
      const forma = item._id || 'Não informado';
      if (!dadosCombinados[forma]) {
        dadosCombinados[forma] = {
          formaPagamento: forma,
          totalGastos: 0,
          quantidadeGastos: 0,
          totalContas: 0,
          quantidadeContas: 0
        };
      }
      dadosCombinados[forma].totalContas = item.totalContas || 0;
      dadosCombinados[forma].quantidadeContas = item.quantidadeContas || 0;
    });
    
    // 4. Calcular totais e percentuais
    const relatorioFormasPagamento = [];
    let totalGeral = 0;
    
    // Calcular total geral
    Object.values(dadosCombinados).forEach(dados => {
      totalGeral += dados.totalGastos + dados.totalContas;
    });
    
    // Montar relatório final com percentuais
    Object.values(dadosCombinados).forEach(dados => {
      const totalForma = dados.totalGastos + dados.totalContas;
      
      if (totalForma > 0) {
        relatorioFormasPagamento.push({
          formaPagamento: dados.formaPagamento,
          totalGastos: dados.totalGastos,
          totalContas: dados.totalContas,
          totalGeral: totalForma,
          quantidadeGastos: dados.quantidadeGastos,
          quantidadeContas: dados.quantidadeContas,
          quantidadeTotal: dados.quantidadeGastos + dados.quantidadeContas,
          percentualGeral: totalGeral > 0 ? (totalForma / totalGeral) * 100 : 0
        });
      }
    });
    
    // 5. Ordenar por total geral (maior para menor)
    relatorioFormasPagamento.sort((a, b) => b.totalGeral - a.totalGeral);
    
    console.log('   ✅ Relatório de formas de pagamento completo');
    console.log(`   Total geral: R$${totalGeral.toFixed(2)}`);
    console.log(`   Formas encontradas: ${relatorioFormasPagamento.length}`);
    
    relatorioFormasPagamento.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.formaPagamento}: R$${item.totalGeral.toFixed(2)} (${item.percentualGeral.toFixed(1)}%)`);
    });
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    console.log('\n🎉 Todos os relatórios estão funcionando corretamente!');
    
  } catch (error) {
    console.error('❌ Erro no teste dos relatórios:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testRelatoriosCorrigidos();
