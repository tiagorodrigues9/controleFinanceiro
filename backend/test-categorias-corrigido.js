const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

const testCategoriasCorrigido = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');
    
    const usuarioId = '6956f5edca85096ad6c7d995';
    const startDate = new Date(2026, 0, 1); // Janeiro 2026
    const endDate = new Date(2026, 1, 0, 23, 59, 59); // Final Janeiro 2026
    
    console.log('🔍 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // 1. Verificar grupos disponíveis
    console.log('\n📋 Grupos disponíveis:');
    const grupos = await Grupo.find({ usuario: new mongoose.Types.ObjectId(usuarioId) });
    grupos.forEach(grupo => {
      console.log(`  ID: ${grupo._id} | Nome: ${grupo.nome}`);
    });
    
    // 2. Verificar estrutura dos gastos
    console.log('\n🔍 Estrutura dos gastos:');
    const gastosExemplo = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    }).limit(5).populate('tipoDespesa.grupo');
    
    gastosExemplo.forEach((gasto, index) => {
      console.log(`\nGasto ${index + 1}:`);
      console.log(`  ID: ${gasto._id}`);
      console.log(`  Valor: R$${gasto.valor}`);
      console.log(`  tipoDespesa.grupo: ${gasto.tipoDespesa?.grupo?._id} - ${gasto.tipoDespesa?.grupo?.nome}`);
      console.log(`  tipoDespesa.subgrupo: ${gasto.tipoDespesa?.subgrupo}`);
    });
    
    // 3. Testar o aggregate CORRIGIDO
    console.log('\n📊 Testando aggregate CORRIGIDO:');
    const relatorioTiposDespesa = await Gasto.aggregate([
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
    
    console.log('Resultado do aggregate corrigido:', JSON.stringify(relatorioTiposDespesa, null, 2));
    
    // 4. Testar o formato do gráfico de barras
    console.log('\n📈 Gráfico de Barras - Top 10 Categorias:');
    const graficoBarras = relatorioTiposDespesa.map(item => ({
      nome: item.grupoNome || 'Sem Categoria',
      valor: item.totalGrupo || 0,
      quantidade: item.quantidade || 0
    })).sort((a, b) => b.valor - a.valor).slice(0, 10);
    
    console.log('Top 10 Categorias:');
    graficoBarras.forEach((item, index) => {
      console.log(`${index + 1}. ${item.nome}: R$${item.valor.toFixed(2)} (${item.quantidade} transações)`);
    });
    
    // 5. Validar estrutura
    console.log('\n✅ VALIDAÇÃO:');
    console.log(`Total de categorias encontradas: ${relatorioTiposDespesa.length}`);
    console.log(`Top 10 categorias: ${graficoBarras.length}`);
    console.log('Estrutura correta:', graficoBarras.every(item => 
      item.nome && 
      typeof item.valor === 'number' && 
      typeof item.quantidade === 'number'
    ) ? '✅ SIM' : '❌ NÃO');
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    await mongoose.disconnect();
  }
};

testCategoriasCorrigido();
