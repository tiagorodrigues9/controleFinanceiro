const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const Extrato = require('./models/Extrato');
const User = require('./models/User');

async function debugMes() {
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

    // Definir período
    const startDate = new Date(2026, 0, 1); // Janeiro 2026
    const endDate = new Date(2026, 0, 31, 23, 59, 59);
    
    console.log('\n🔍 Período de teste:');
    console.log('Start:', startDate);
    console.log('End:', endDate);

    // Verificar gastos no período
    console.log('\n💰 Verificando gastos...');
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: user._id,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    
    console.log('gastosMes:', gastosMes);
    console.log('Total gastos mês:', gastosMes[0]?.total || 0);

    // Verificar extratos no período
    console.log('\n📋 Verificando extratos...');
    const extratoMes = await Extrato.aggregate([
      {
        $match: {
          usuario: user._id,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$tipo",
          total: { $sum: "$valor" }
        }
      }
    ]);
    
    console.log('extratoMes:', extratoMes);

    // Verificar alguns gastos individuais
    console.log('\n🔍 Verificando alguns gastos individuais...');
    const algunsGastos = await Gasto.find({
      usuario: user._id,
      data: { $gte: startDate, $lte: endDate }
    }).limit(5);
    
    console.log('Primeiros 5 gastos:');
    algunsGastos.forEach((gasto, index) => {
      console.log(`${index + 1}. ${gasto.descricao || 'Sem desc'} - ${gasto.valor} - ${gasto.data}`);
    });

    // Verificar alguns extratos individuais
    console.log('\n🔍 Verificando alguns extratos individuais...');
    const algunsExtratos = await Extrato.find({
      usuario: user._id,
      data: { $gte: startDate, $lte: endDate }
    }).limit(5);
    
    console.log('Primeiros 5 extratos:');
    algunsExtratos.forEach((extrato, index) => {
      console.log(`${index + 1}. ${extrato.motivo} - ${extrato.valor} (${extrato.tipo}) - ${extrato.data}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

debugMes();
