const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

// Importar as funções do dashboard
const fs = require('fs');
const path = require('path');

// Carregar as funções do dashboard
const dashboardCode = fs.readFileSync(path.join(__dirname, 'api/dashboard.js'), 'utf8');
const getRelatorioFormasPagamentoMatch = dashboardCode.match(/const getRelatorioFormasPagamento = async \([^)]+\) => {[\s\S]*?};/);
const getRelatorioTiposDespesaMatch = dashboardCode.match(/const getRelatorioTiposDespesa = async \([^)]+\) => {[\s\S]*?};/);

const testRelatorios = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');
    
    const usuarioId = '6956f5edca85096ad6c7d995';
    const startDate = new Date(2026, 0, 1); // Janeiro 2026
    const endDate = new Date(2026, 1, 0, 23, 59, 59); // Final Janeiro 2026
    
    console.log('🔍 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // 1. Testar se há dados básicos
    console.log('\n📊 Verificando dados básicos:');
    const totalGastos = await Gasto.countDocuments({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    });
    
    const totalGrupos = await Grupo.countDocuments({
      usuario: new mongoose.Types.ObjectId(usuarioId)
    });
    
    console.log(`Total de gastos no período: ${totalGastos}`);
    console.log(`Total de grupos cadastrados: ${totalGrupos}`);
    
    if (totalGastos === 0) {
      console.log('❌ Nenhum gasto encontrado no período - os relatórios estarão vazios');
      return;
    }
    
    // 2. Testar aggregate básico de formas de pagamento
    console.log('\n💳 Testando formas de pagamento (aggregate direto):');
    const formasPagamentoTest = await Gasto.aggregate([
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
    
    console.log('Formas de pagamento encontradas:');
    console.log(JSON.stringify(formasPagamentoTest, null, 2));
    
    // 3. Testar aggregate básico de tipos de despesa
    console.log('\n📋 Testando tipos de despesa (aggregate direto):');
    const tiposDespesaTest = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$tipoDespesa.grupo',
          totalGrupo: { $sum: '$valor' },
          quantidade: { $sum: 1 }
        }
      }
    ]);
    
    console.log('Tipos de despesa encontrados:');
    console.log(JSON.stringify(tiposDespesaTest, null, 2));
    
    // 4. Verificar estrutura dos gastos
    console.log('\n💰 Verificando estrutura dos gastos:');
    const gastosExemplo = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    }).limit(3);
    
    gastosExemplo.forEach((gasto, index) => {
      console.log(`\nGasto ${index + 1}:`);
      console.log(`  formaPagamento: "${gasto.formaPagamento}"`);
      console.log(`  tipoDespesa: ${JSON.stringify(gasto.tipoDespesa)}`);
    });
    
    // 5. Testar lookup para grupos
    console.log('\n🔍 Testando lookup para grupos:');
    const tiposDespesaComLookup = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$tipoDespesa.grupo',
          totalGrupo: { $sum: '$valor' },
          quantidade: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'grupos',
          localField: '_id',
          foreignField: '_id',
          as: 'grupoInfo'
        }
      },
      {
        $unwind: '$grupoInfo'
      },
      {
        $project: {
          _id: 1,
          totalGrupo: 1,
          quantidade: 1,
          grupoNome: '$grupoInfo.nome'
        }
      }
    ]);
    
    console.log('Tipos de despesa com lookup:');
    console.log(JSON.stringify(tiposDespesaComLookup, null, 2));
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.disconnect();
  }
};

testRelatorios();
