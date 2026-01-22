const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Extrato = require('./models/Extrato');
const User = require('./models/User');

async function debugExtrato() {
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

    // Verificar extratos do usuário
    console.log('\n📋 Verificando extratos do usuário...');
    const extratos = await Extrato.find({ usuario: user._id }).limit(10);
    
    console.log('Total de extratos:', extratos.length);
    extratos.forEach((item, index) => {
      console.log(`${index + 1}. ${item.motivo} - R$ ${item.valor} (${item.tipo}) - ${item.contaBancaria}`);
    });

    // Verificar extratos por conta bancária
    console.log('\n🏦 Verificando extratos por conta bancária...');
    const extratosPorConta = await Extrato.aggregate([
      { $match: { usuario: user._id } },
      {
        $group: {
          _id: '$contaBancaria',
          total: { $sum: '$valor' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'contabancarias',
          localField: '_id',
          foreignField: '_id',
          as: 'conta'
        }
      },
      {
        $unwind: '$conta'
      },
      {
        $project: {
          nomeConta: '$conta.nome',
          total: 1,
          count: 1
        }
      }
    ]);
    
    console.log('Extratos por conta:');
    extratosPorConta.forEach((item, index) => {
      console.log(`${index + 1}. ${item.nomeConta}: ${item.count} extratos, total: R$ ${item.total}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

debugExtrato();
