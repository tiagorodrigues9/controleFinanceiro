const mongoose = require('mongoose');
require('dotenv').config();

// Models
const ContaBancaria = require('./models/ContaBancaria');
const Extrato = require('./models/Extrato');

// Função getEvolucaoSaldo (copiada do dashboard.js)
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

// Teste da função getEvolucaoSaldo
const testEvolucaoSaldoCorrigido = async () => {
  try {
    console.log('🔍 Iniciando teste da evolução do saldo corrigida...');
    
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
    
    console.log(`📅 Período: ${mesAtual}/${anoAtual}`);
    
    // Verificar contas bancárias
    console.log('\n📋 Verificando contas bancárias...');
    const contasBancarias = await ContaBancaria.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    console.log(`Contas encontradas: ${contasBancarias.length}`);
    contasBancarias.forEach((conta, index) => {
      console.log(`${index + 1}. ${conta.nome} (${conta.banco})`);
    });
    
    // Verificar extratos
    console.log('\n📄 Verificando extratos...');
    const totalExtratos = await Extrato.countDocuments({
      usuario: new mongoose.Types.ObjectId(usuarioId)
    });
    console.log(`Total de extratos: ${totalExtratos}`);
    
    // Testar a função getEvolucaoSaldo
    console.log('\n🏦 Testando getEvolucaoSaldo...');
    const resultado = await getEvolucaoSaldo(usuarioId, mesAtual, anoAtual);
    
    console.log('\n📊 Resultado da evolução do saldo:');
    console.log(JSON.stringify(resultado, null, 2));
    
    // Validação
    console.log('\n✅ Validação:');
    if (resultado.length > 0) {
      const primeira = resultado[0];
      console.log(`✅ Tem nome da conta: ${primeira.conta ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem banco: ${primeira.banco ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem contaId: ${primeira.contaId ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem saldos: ${Array.isArray(primeira.saldos) ? 'SIM' : 'NÃO'}`);
      
      if (primeira.saldos.length > 0) {
        const saldo = primeira.saldos[0];
        console.log(`✅ Saldo tem data: ${saldo.data ? 'SIM' : 'NÃO'}`);
        console.log(`✅ Saldo tem valor: ${typeof saldo.saldo === 'number' ? 'SIM' : 'NÃO'}`);
        console.log(`✅ Saldo tem quantidade: ${typeof saldo.quantidadeTransacoes === 'number' ? 'SIM' : 'NÃO'}`);
      }
    } else {
      console.log('⚠️  Nenhuma conta com dados de evolução encontrada');
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    console.log('\n🎉 Teste da evolução do saldo concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testEvolucaoSaldoCorrigido();
