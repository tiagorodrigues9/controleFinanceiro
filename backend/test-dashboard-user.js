const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const Extrato = require('./models/Extrato');
const User = require('./models/User');

async function testDashboardUser() {
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

    // Buscar usuário correto
    const user = await User.findOne({ email: 'tr364634@gmail.com' });
    console.log('👤 Usuário ID:', user._id);

    // Usar exatamente a mesma lógica do dashboard
    const startDate = new Date(2026, 0, 1);
    const endDate = new Date(2026, 0, 1);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);
    const finalEndDate = new Date(endDate.getTime() - 1);
    finalEndDate.setUTCHours(23, 59, 59, 999);
    
    console.log('\n🔍 Período exato como no dashboard:');
    console.log('startDate:', startDate.toISOString());
    console.log('finalEndDate:', finalEndDate.toISOString());

    // Testar aggregate de gastos (exatamente como no dashboard)
    console.log('\n💰 Testando aggregate de gastos...');
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: user._id,
          data: { $gte: startDate, $lte: finalEndDate }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    
    console.log('gastosMes (aggregate):', gastosMes);

    // Testar aggregate de extratos (exatamente como no dashboard)
    console.log('\n📋 Testando aggregate de extratos...');
    const extratoMes = await Extrato.aggregate([
      {
        $match: {
          usuario: user._id,
          data: { $gte: startDate, $lte: finalEndDate }
        }
      },
      {
        $group: {
          _id: "$tipo",
          total: { $sum: "$valor" }
        }
      }
    ]);
    
    console.log('extratoMes (aggregate):', extratoMes);

    // Testar find normal para comparação
    console.log('\n🔍 Testando find normal...');
    const gastosFind = await Gasto.find({
      usuario: user._id,
      data: { $gte: startDate, $lte: finalEndDate }
    });
    
    console.log('gastosFind (count):', gastosFind.length);
    if (gastosFind.length > 0) {
      console.log('Primeiro gasto data:', gastosFind[0].data.toISOString());
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

testDashboardUser();
