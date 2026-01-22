const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

const testSubgrupos = async () => {
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
    
    // 2. Verificar estrutura dos gastos com subgrupos
    console.log('\n💰 Verificando gastos com subgrupos:');
    const gastosExemplo = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    }).limit(5);
    
    gastosExemplo.forEach((gasto, index) => {
      console.log(`\nGasto ${index + 1}:`);
      console.log(`  ID: ${gasto._id}`);
      console.log(`  Valor: R$${gasto.valor}`);
      console.log(`  tipoDespesa: ${JSON.stringify(gasto.tipoDespesa)}`);
    });
    
    // 3. Testar a nova lógica de subgrupos (como no dashboard)
    console.log('\n📊 Testando lógica de subgrupos:');
    
    // Calcular total geral
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
    
    const totalGeral = totalGeralResult[0]?.total || 0;
    console.log(`Total geral de gastos: R$${totalGeral.toFixed(2)}`);
    
    // Para cada grupo, buscar gastos com subgrupos
    const relatorioDetalhado = await Promise.all(
      grupos.map(async (grupo) => {
        console.log(`\n🔍 Processando grupo: ${grupo.nome}`);
        
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
        
        console.log(`  Gastos encontrados: ${gastosGrupo.length}`);
        gastosGrupo.forEach((gasto, index) => {
          console.log(`    ${index + 1}. Subgrupo: "${gasto._id}" | Valor: R$${gasto.valor.toFixed(2)} | Qtd: ${gasto.quantidade}`);
        });
        
        // Se não houver gastos para este grupo, retornar null
        if (gastosGrupo.length === 0) {
          console.log(`  ❌ Nenhum gasto encontrado para este grupo`);
          return null;
        }
        
        // Calcular total do grupo
        const totalGrupo = gastosGrupo.reduce((acc, item) => acc + item.valor, 0);
        console.log(`  💰 Total do grupo: R$${totalGrupo.toFixed(2)}`);
        
        // Processar subgrupos com percentuais
        const subgrupos = gastosGrupo.map(item => ({
          subgrupoNome: item._id || 'Não categorizado',
          valor: item.valor,
          quantidade: item.quantidade,
          percentualSubgrupo: totalGrupo > 0 ? (item.valor / totalGrupo) * 100 : 0
        }));
        
        console.log(`  📊 Subgrupos com percentuais:`);
        subgrupos.forEach((subgrupo, index) => {
          console.log(`    ${index + 1}. ${subgrupo.subgrupoNome}: R$${subgrupo.valor.toFixed(2)} (${subgrupo.percentualSubgrupo.toFixed(1)}%)`);
        });
        
        return {
          grupoId: grupo._id,
          grupoNome: grupo.nome,
          totalGrupo: totalGrupo,
          quantidade: gastosGrupo.reduce((acc, item) => acc + item.quantidade, 0),
          percentualGrupo: totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0,
          subgrupos: subgrupos
        };
      })
    );
    
    // Filtrar grupos sem gastos e ordenar
    const relatorioFiltrado = relatorioDetalhado
      .filter(item => item !== null && item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);
    
    console.log('\n📈 Relatório Final:');
    console.log(JSON.stringify(relatorioFiltrado, null, 2));
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.disconnect();
  }
};

testSubgrupos();
