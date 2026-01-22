const mongoose = require('mongoose');
require('dotenv').config();

const getSubgruposEssencial = require('./getSubgruposEssencial');

// Teste da função essencial de subgrupos
const testSubgruposEssencial = async () => {
  try {
    console.log('🔍 Iniciando teste essencial de subgrupos...');
    
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
    
    // Testar a função essencial
    console.log('\n🚀 Testando getSubgruposEssencial...');
    const resultado = await getSubgruposEssencial(usuarioId, startDate, endDate);
    
    console.log('\n📊 Resultado da função essencial:');
    console.log(JSON.stringify(resultado, null, 2));
    
    // Validação detalhada
    console.log('\n✅ Validação detalhada:');
    if (resultado.length > 0) {
      console.log(`✅ Total de grupos: ${resultado.length}`);
      
      resultado.forEach((grupo, index) => {
        console.log(`\n📋 Grupo ${index + 1}:`);
        console.log(`  ✅ Tem grupoId: ${grupo.grupoId ? 'SIM' : 'NÃO'}`);
        console.log(`  ✅ Tem grupoNome: ${grupo.grupoNome ? 'SIM' : 'NÃO'}`);
        console.log(`  ✅ Tem totalGrupo: ${typeof grupo.totalGrupo === 'number' ? 'SIM' : 'NÃO'} (${grupo.totalGrupo})`);
        console.log(`  ✅ Tem quantidade: ${typeof grupo.quantidade === 'number' ? 'SIM' : 'NÃO'} (${grupo.quantidade})`);
        console.log(`  ✅ Tem percentualGrupo: ${typeof grupo.percentualGrupo === 'number' ? 'SIM' : 'NÃO'} (${grupo.percentualGrupo}%)`);
        console.log(`  ✅ Tem subgrupos: ${Array.isArray(grupo.subgrupos) ? 'SIM' : 'NÃO'} (${grupo.subgrupos.length})`);
        
        if (grupo.subgrupos.length > 0) {
          console.log(`  📊 Subgrupos do grupo "${grupo.grupoNome}":`);
          grupo.subgrupos.forEach((subgrupo, subIndex) => {
            console.log(`    ${subIndex + 1}. ${subgrupo.subgrupoNome}: R$${subgrupo.valor} (${subgrupo.percentualSubgrupo}%)`);
            console.log(`       ✅ Nome: ${subgrupo.subgrupoNome ? 'SIM' : 'NÃO'}`);
            console.log(`       ✅ Valor: ${typeof subgrupo.valor === 'number' ? 'SIM' : 'NÃO'}`);
            console.log(`       ✅ Quantidade: ${typeof subgrupo.quantidade === 'number' ? 'SIM' : 'NÃO'}`);
            console.log(`       ✅ Percentual: ${typeof subgrupo.percentualSubgrupo === 'number' ? 'SIM' : 'NÃO'}`);
          });
        }
      });
    } else {
      console.log('⚠️  Nenhum grupo retornado');
    }
    
    // Teste de performance
    console.log('\n⏱️  Teste de performance:');
    const startTime = Date.now();
    const resultado2 = await getSubgruposEssencial(usuarioId, startDate, endDate);
    const endTime = Date.now();
    console.log(`⏱️  Tempo de execução: ${endTime - startTime}ms`);
    console.log(`⏱️  Consistência: ${JSON.stringify(resultado) === JSON.stringify(resultado2) ? 'SIM' : 'NÃO'}`);
    
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    console.log('\n🎉 Teste essencial de subgrupos concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste essencial:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testSubgruposEssencial();
