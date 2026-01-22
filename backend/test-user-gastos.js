const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const User = require('./models/User');

async function testUserGastos() {
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

    // ID do usuário logado
    const userIdString = '6956f5edca85096ad6c7d995';
    const userIdObjectId = new mongoose.Types.ObjectId(userIdString);
    
    console.log('👤 User ID logado:', userIdString);

    // Contar todos os gastos por usuário
    console.log('\n🔍 Contando gastos por usuário...');
    const gastosPorUsuario = await Gasto.aggregate([
      {
        $group: {
          _id: '$usuario',
          count: { $sum: 1 },
          totalValor: { $sum: '$valor' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userEmail: '$user.email',
          count: 1,
          totalValor: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('Gastos por usuário:');
    gastosPorUsuario.forEach((item, index) => {
      console.log(`${index + 1}. ${item.userEmail}: ${item.count} gastos, total: ${item.totalValor}`);
    });

    // Gastos do usuário correto em janeiro 2026
    console.log('\n🔍 Gastos do usuário correto em janeiro 2026...');
    const gastosUserCorreto = await Gasto.find({
      usuario: userIdObjectId,
      data: { $gte: new Date('2026-01-01'), $lte: new Date('2026-01-31') }
    });
    
    console.log('Gastos do usuário correto:', gastosUserCorreto.length);
    gastosUserCorreto.forEach((gasto, index) => {
      console.log(`${index + 1}. ${gasto.descricao || 'Sem desc'} - ${gasto.valor} - ${gasto.data.toISOString()}`);
    });

    // Aggregate do usuário correto
    console.log('\n💰 Aggregate do usuário correto...');
    const aggregateUserCorreto = await Gasto.aggregate([
      {
        $match: {
          usuario: userIdObjectId,
          data: { $gte: new Date('2026-01-01'), $lte: new Date('2026-01-31') }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    
    console.log('Aggregate resultado:', aggregateUserCorreto);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

testUserGastos();
