const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const User = require('./models/User');

async function testDatasISO() {
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

    // Testar com datas ISO como no dashboard
    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const finalEndDate = new Date('2026-01-31T23:59:59.999Z');
    
    console.log('\n🔍 Testando com datas ISO:');
    console.log('startDate:', startDate.toISOString());
    console.log('finalEndDate:', finalEndDate.toISOString());

    // Verificar gastos
    const gastosMes = await Gasto.find({
      usuario: user._id,
      data: { $gte: startDate, $lte: finalEndDate }
    });
    
    console.log('Gastos encontrados:', gastosMes.length);
    if (gastosMes.length > 0) {
      console.log('Primeiro gasto:', gastosMes[0].data.toISOString());
    }

    // Testar com string ISO
    console.log('\n🔍 Testando com string ISO:');
    const gastosString = await Gasto.find({
      usuario: user._id,
      data: { 
        $gte: new Date('2026-01-01T00:00:00.000Z'), 
        $lte: new Date('2026-01-31T23:59:59.999Z') 
      }
    });
    
    console.log('Gastos com string ISO:', gastosString.length);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

testDatasISO();
