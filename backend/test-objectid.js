const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('./models/Gasto');
const User = require('./models/User');

async function testObjectId() {
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

    // ID do usuário (como string e como ObjectId)
    const userIdString = '6956f5edca85096ad6c7d995';
    const userIdObjectId = new mongoose.Types.ObjectId(userIdString);
    
    console.log('👤 User ID (string):', userIdString);
    console.log('👤 User ID (ObjectId):', userIdObjectId);

    // Buscar usuário
    const user = await User.findById(userIdObjectId);
    console.log('👤 Usuário encontrado:', user ? 'SIM' : 'NÃO');

    // Testar gastos com string
    console.log('\n🔍 Testando gastos com string ID...');
    const gastosString = await Gasto.find({
      usuario: userIdString,
      data: { $gte: new Date('2026-01-01'), $lte: new Date('2026-01-31') }
    });
    console.log('Gastos com string ID:', gastosString.length);

    // Testar gastos com ObjectId
    console.log('\n🔍 Testando gastos com ObjectId...');
    const gastosObjectId = await Gasto.find({
      usuario: userIdObjectId,
      data: { $gte: new Date('2026-01-01'), $lte: new Date('2026-01-31') }
    });
    console.log('Gastos com ObjectId:', gastosObjectId.length);

    // Verificar os IDs nos gastos
    console.log('\n🔍 Verificando IDs nos gastos...');
    const todosGastos = await Gasto.find({}).limit(5);
    todosGastos.forEach((gasto, index) => {
      console.log(`${index + 1}. Gasto usuario ID:`, gasto.usuario.toString());
      console.log(`    Tipo:`, typeof gasto.usuario);
      console.log(`    É ObjectId?:`, gasto.usuario instanceof mongoose.Types.ObjectId);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

testObjectId();
