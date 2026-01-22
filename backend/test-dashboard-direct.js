const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const Extrato = require('./models/Extrato');
const User = require('./models/User');

async function testDashboardDirect() {
  try {
    // Conectar ao MongoDB (usando a mesma lógica do server.js)
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
    
    console.log('\n🔍 Período:');
    console.log('Start:', startDate);
    console.log('End:', endDate);

    // Simular req.user
    const mockReq = { user: { _id: user._id } };

    // Verificar gastos no período (como no dashboard)
    console.log('\n💰 Verificando gastos...');
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: mockReq.user._id,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    
    console.log('gastosMes:', gastosMes);
    console.log('Total gastos mês:', gastosMes[0]?.total || 0);

    // Verificar extratos no período (como no dashboard)
    console.log('\n📋 Verificando extratos...');
    const extratoMes = await Extrato.aggregate([
      {
        $match: {
          usuario: mockReq.user._id,
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

    // Processar resultados (como no dashboard)
    let totalEntradas = 0;
    let totalSaidas = 0;

    extratoMes.forEach(item => {
      if (item._id === 'Entrada') {
        totalEntradas = item.total;
      } else if (item._id === 'Saída') {
        totalSaidas = item.total;
      }
    });

    console.log('\n💰 Resultados finais:');
    console.log('totalGastosMes:', gastosMes[0]?.total || 0);
    console.log('totalEntradasMes:', totalEntradas);
    console.log('totalSaidasMes:', totalSaidas);
    console.log('saldoMes:', totalEntradas - totalSaidas);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

testDashboardDirect();
