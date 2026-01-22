const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

// Teste final dos subgrupos no relatório de tipos de despesa
const testSubgruposFinal = async () => {
  try {
    console.log('🔍 Iniciando teste final dos subgrupos...');
    
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
    console.log('\n💰 Verificando estrutura dos gastos:');
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
    
    // 3. Calcular total geral para percentuais
    console.log('\n💰 Calculando total geral...');
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
    console.log(`Total geral de gastos: R$${totalGeralDespesas.toFixed(2)}`);
    
    // 4. Para cada grupo, buscar gastos e processar subgrupos
    console.log('\n📊 Processando subgrupos...');
    const relatorioTiposDespesaDetalhado = await Promise.all(
      grupos.map(async (grupo, index) => {
        console.log(`\n🔍 Processando grupo ${index + 1}: ${grupo.nome}`);
        
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
          percentualGrupo: totalGeralDespesas > 0 ? (totalGrupo / totalGeralDespesas) * 100 : 0,
          subgrupos: subgrupos
        };
      })
    );
    
    // 5. Filtrar grupos sem gastos e ordenar
    const relatorioFiltrado = relatorioTiposDespesaDetalhado
      .filter(item => item !== null && item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);
    
    console.log('\n📈 Relatório Final:');
    console.log(JSON.stringify(relatorioFiltrado, null, 2));
    
    // 6. Validação final
    console.log('\n✅ Validação final:');
    if (relatorioFiltrado.length > 0) {
      const primeiro = relatorioFiltrado[0];
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
        console.log(`✅ Subgrupo tem quantidade: ${typeof subgrupo.quantidade === 'number' ? 'SIM' : 'NÃO'}`);
      }
    }
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    console.log('\n🎉 Teste de subgrupos concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste de subgrupos:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testSubgruposFinal();
