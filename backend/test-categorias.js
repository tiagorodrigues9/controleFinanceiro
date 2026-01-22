const mongoose = require('mongoose');
const Gasto = require('./models/Gasto');

const testCategorias = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/controle-financeiro');
    console.log('✅ Conectado ao MongoDB');
    
    const usuarioId = '6956f5edca85096ad6c7d995';
    const startDate = new Date(2026, 0, 1); // Janeiro 2026
    const endDate = new Date(2026, 1, 0, 23, 59, 59); // Final Janeiro 2026
    
    console.log('🔍 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // Testar aggregate por grupo (como no api/dashboard.js)
    console.log('\n📊 Testando relatório do api/dashboard.js:');
    const relatorioTiposDespesa = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$grupo',
          totalGrupo: { $sum: '$valor' }
        }
      }
    ]);
    
    console.log('Resultado do aggregate:', JSON.stringify(relatorioTiposDespesa, null, 2));
    
    // Verificar estrutura dos dados
    console.log('\n🔍 Verificando estrutura dos gastos:');
    const gastosExemplo = await Gasto.find({
      usuario: new mongoose.Types.ObjectId(usuarioId),
      data: { $gte: startDate, $lte: endDate }
    }).limit(3);
    
    gastosExemplo.forEach((gasto, index) => {
      console.log(`Gasto ${index + 1}:`);
      console.log(`  ID: ${gasto._id}`);
      console.log(`  Descrição: ${gasto.descricao}`);
      console.log(`  Valor: ${gasto.valor}`);
      console.log(`  Grupo: ${JSON.stringify(gasto.grupo)}`);
      console.log(`  Tipo Despesa: ${JSON.stringify(gasto.tipoDespesa)}`);
      console.log('---');
    });
    
    // Testar o formato do gráfico de barras
    console.log('\n📈 Testando formato do gráfico de barras:');
    const graficoBarras = relatorioTiposDespesa.map(item => ({
      nome: item.grupoNome || 'Sem Categoria',
      valor: item.totalGrupo || 0
    })).sort((a, b) => b.valor - a.valor).slice(0, 10);
    
    console.log('Gráfico de Barras:', JSON.stringify(graficoBarras, null, 2));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
};

testCategorias();
