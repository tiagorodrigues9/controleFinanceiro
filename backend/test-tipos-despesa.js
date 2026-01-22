const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

const testTiposDespesa = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');
    
    const usuarioId = '6956f5edca85096ad6c7d995';
    const startDate = new Date(2026, 0, 1); // Janeiro 2026
    const endDate = new Date(2026, 1, 0, 23, 59, 59); // Final Janeiro 2026
    
    console.log('🔍 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // 1. Verificar grupos disponíveis
    console.log('\n📋 Grupos disponíveis:');
    const grupos = await Grupo.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    grupos.forEach((grupo, index) => {
      console.log(`${index + 1}. ID: ${grupo._id} | Nome: "${grupo.nome}"`);
      if (grupo.subgrupos && grupo.subgrupos.length > 0) {
        console.log(`   Subgrupos: ${grupo.subgrupos.map(s => s.nome).join(', ')}`);
      }
    });
    
    // 2. Verificar estrutura dos gastos com tipoDespesa
    console.log('\n💰 Estrutura dos gastos (tipoDespesa):');
    const gastosExemplo = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    }).limit(5).populate('tipoDespesa.grupo');
    
    gastosExemplo.forEach((gasto, index) => {
      console.log(`\nGasto ${index + 1}:`);
      console.log(`  ID: ${gasto._id}`);
      console.log(`  Valor: R$${gasto.valor}`);
      console.log(`  tipoDespesa: ${JSON.stringify(gasto.tipoDespesa)}`);
    });
    
    // 3. Testar aggregate do api/dashboard.js
    console.log('\n📊 Testando aggregate do api/dashboard.js:');
    const relatorioTiposDespesaAPI = await Gasto.aggregate([
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
    
    console.log('Resultado do aggregate (api/dashboard.js):');
    console.log(JSON.stringify(relatorioTiposDespesaAPI, null, 2));
    
    // 4. Testar lógica do routes/dashboard.js
    console.log('\n📊 Testando lógica do routes/dashboard.js:');
    
    // Calcular total geral para percentuais
    const gastosGerais = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    });
    
    const totalGeral = gastosGerais.reduce((acc, gasto) => {
      const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
      return acc + valorGasto;
    }, 0);
    
    console.log(`Total geral de gastos: R$${totalGeral.toFixed(2)}`);
    
    // Processar como no routes/dashboard.js
    const relatorioTiposDespesaRoutes = await Promise.all(
      grupos.map(async (grupo) => {
        const gastosGrupo = await Gasto.find({
          usuario: new mongoose.Types.ObjectId(usuarioId),
          'tipoDespesa.grupo': grupo._id,
          data: { $gte: startDate, $lte: endDate }
        }).populate('tipoDespesa.grupo');

        const gastosPorSubgrupo = {};
        gastosGrupo.forEach(gasto => {
          const subgrupoNome = gasto.tipoDespesa.subgrupo || 'Não categorizado';
          const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
          gastosPorSubgrupo[subgrupoNome] = (gastosPorSubgrupo[subgrupoNome] || 0) + valorGasto;
        });

        const totalGrupo = Object.values(gastosPorSubgrupo).reduce((acc, valor) => acc + valor, 0);

        return {
          grupoId: grupo._id,
          grupoNome: grupo.nome,
          totalGrupo: totalGrupo,
          percentualGrupo: totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0,
          subgrupos: Object.entries(gastosPorSubgrupo).map(([subgrupoNome, valor]) => ({
            subgrupoNome,
            valor,
            percentualSubgrupo: totalGrupo > 0 ? (valor / totalGrupo) * 100 : 0
          })).sort((a, b) => b.valor - a.valor)
        };
      })
    );

    const relatorioTiposDespesaFiltrado = relatorioTiposDespesaRoutes
      .filter(item => item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);
    
    console.log('Resultado (routes/dashboard.js):');
    console.log(JSON.stringify(relatorioTiposDespesaFiltrado, null, 2));
    
    // 5. Comparação entre as duas abordagens
    console.log('\n🔍 Comparação entre api/dashboard.js e routes/dashboard.js:');
    console.log(`API (aggregate): ${relatorioTiposDespesaAPI.length} grupos`);
    console.log(`Routes (detalhado): ${relatorioTiposDespesaFiltrado.length} grupos`);
    
    // 6. Validar estrutura esperada
    console.log('\n✅ Validação da estrutura:');
    if (relatorioTiposDespesaFiltrado.length > 0) {
      const primeiro = relatorioTiposDespesaFiltrado[0];
      console.log(`✅ Tem grupoId: ${primeiro.grupoId ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem grupoNome: ${primeiro.grupoNome ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem totalGrupo: ${typeof primeiro.totalGrupo === 'number' ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem percentualGrupo: ${typeof primeiro.percentualGrupo === 'number' ? 'SIM' : 'NÃO'}`);
      console.log(`✅ Tem subgrupos: ${Array.isArray(primeiro.subgrupos) ? 'SIM' : 'NÃO'}`);
      
      if (primeiro.subgrupos.length > 0) {
        const subgrupo = primeiro.subgrupos[0];
        console.log(`✅ Subgrupo tem nome: ${subgrupo.subgrupoNome ? 'SIM' : 'NÃO'}`);
        console.log(`✅ Subgrupo tem valor: ${typeof subgrupo.valor === 'number' ? 'SIM' : 'NÃO'}`);
        console.log(`✅ Subgrupo tem percentual: ${typeof subgrupo.percentualSubgrupo === 'number' ? 'SIM' : 'NÃO'}`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.disconnect();
  }
};

testTiposDespesa();
