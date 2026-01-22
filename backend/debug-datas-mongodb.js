const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const User = require('./models/User');

async function debugDatasMongoDB() {
  try {
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

    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB');

    // Buscar usuário
    const user = await User.findOne({ email: 'tr364634@gmail.com' });
    console.log('👤 Usuário ID:', user._id);

    // Definir período como no dashboard
    const startDate = new Date(2026, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(2026, 0, 0, 23, 59, 59, 999);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
    
    console.log('\n🔍 Período (como no dashboard):');
    console.log('startDate:', startDate.toISOString());
    console.log('endDate:', endDate.toISOString());

    // Verificar gastos individuais para debug
    console.log('\n🔍 Verificando gastos individuais...');
    const todosGastos = await Gasto.find({ usuario: user._id }).limit(10);
    
    console.log('Todos os gastos:');
    todosGastos.forEach((gasto, index) => {
      console.log(`${index + 1}. ${gasto.descricao || 'Sem desc'} - ${gasto.valor} - ${gasto.data.toISOString()}`);
    });

    // Verificar gastos no período
    console.log('\n🔍 Verificando gastos no período...');
    const gastosMes = await Gasto.find({
      usuario: user._id,
      data: { $gte: startDate, $lte: endDate }
    });
    
    console.log('Gastos encontrados no período:', gastosMes.length);
    gastosMes.forEach((gasto, index) => {
      console.log(`${index + 1}. ${gasto.descricao || 'Sem desc'} - ${gasto.valor} - ${gasto.data.toISOString()}`);
    });

    // Testar com diferentes datas
    console.log('\n🔍 Testando com datas diferentes...');
    
    // Teste 1: Janeiro 2026 sem UTC
    const startDate1 = new Date('2026-01-01');
    const endDate1 = new Date('2026-01-31');
    console.log('Teste 1 - sem UTC:', startDate1.toISOString(), 'a', endDate1.toISOString());
    
    const gastos1 = await Gasto.find({
      usuario: user._id,
      data: { $gte: startDate1, $lte: endDate1 }
    });
    console.log('Resultados Teste 1:', gastos1.length);

    // Teste 2: Janeiro 2026 com UTC
    const startDate2 = new Date('2026-01-01T00:00:00.000Z');
    const endDate2 = new Date('2026-01-31T23:59:59.999Z');
    console.log('Teste 2 - com UTC:', startDate2.toISOString(), 'a', endDate2.toISOString());
    
    const gastos2 = await Gasto.find({
      usuario: user._id,
      data: { $gte: startDate2, $lte: endDate2 }
    });
    console.log('Resultados Teste 2:', gastos2.length);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

debugDatasMongoDB();
