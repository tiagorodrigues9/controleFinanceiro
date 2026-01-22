const mongoose = require('mongoose');
require('dotenv').config();

const getSubgruposSeguro = require('./getSubgruposSeguro');

// Teste da função segura de subgrupos
const testSubgruposSeguro = async () => {
  try {
    console.log('🔍 Iniciando teste da função segura de subgrupos...');
    
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
    
    // Testar a função segura
    const resultado = await getSubgruposSeguro(usuarioId, startDate, endDate);
    
    console.log('\n📊 Resultado da função segura:');
    console.log(JSON.stringify(resultado, null, 2));
    
    // Validação
    console.log('\n✅ Validação:');
    if (resultado.length > 0) {
      const primeiro = resultado[0];
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
    console.log('\n🎉 Teste da função segura concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    console.error('Stack:', error.stack);
    await mongoose.disconnect();
  }
};

testSubgruposSeguro();
