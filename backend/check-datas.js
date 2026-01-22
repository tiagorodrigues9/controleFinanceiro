const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Extrato = require('./models/Extrato');
const User = require('./models/User');

async function checkDatas() {
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
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    console.log('👤 Usuário:', user._id);

    // Verificar contas e suas datas
    const contas = await Conta.find({ usuario: user._id });
    console.log('\n📄 Contas encontradas:', contas.length);
    
    contas.forEach((conta, index) => {
      console.log(`${index + 1}. ${conta.nome}`);
      console.log(`   Valor: ${conta.valor}`);
      console.log(`   Status: ${conta.status}`);
      console.log(`   Data Vencimento: ${conta.dataVencimento}`);
      console.log(`   Data Pagamento: ${conta.dataPagamento || 'N/A'}`);
      console.log('');
    });

    // Verificar gastos e suas datas
    const gastos = await Gasto.find({ usuario: user._id });
    console.log('\n💰 Gastos encontrados:', gastos.length);
    
    gastos.forEach((gasto, index) => {
      console.log(`${index + 1}. ${gasto.descricao || 'Sem descrição'}`);
      console.log(`   Valor: ${gasto.valor}`);
      console.log(`   Data: ${gasto.data}`);
      console.log('');
    });

    // Verificar extratos e suas datas
    const extratos = await Extrato.find({ usuario: user._id });
    console.log('\n📋 Extratos encontrados:', extratos.length);
    
    extratos.forEach((extrato, index) => {
      console.log(`${index + 1}. ${extrato.motivo}`);
      console.log(`   Valor: ${extrato.valor}`);
      console.log(`   Tipo: ${extrato.tipo}`);
      console.log(`   Data: ${extrato.data}`);
      console.log('');
    });

    // Testar filtros para janeiro/2026
    const startDate = new Date(2026, 0, 1); // Janeiro 2026
    const endDate = new Date(2026, 0, 31, 23, 59, 59);
    
    console.log('\n🔍 Testando filtros para janeiro/2026:');
    console.log('Período:', startDate, 'a', endDate);
    
    const contasJaneiro = await Conta.find({
      usuario: user._id,
      dataVencimento: { $gte: startDate, $lte: endDate }
    });
    console.log('Contas em janeiro/2026:', contasJaneiro.length);
    
    const gastosJaneiro = await Gasto.find({
      usuario: user._id,
      data: { $gte: startDate, $lte: endDate }
    });
    console.log('Gastos em janeiro/2026:', gastosJaneiro.length);
    
    const extratosJaneiro = await Extrato.find({
      usuario: user._id,
      data: { $gte: startDate, $lte: endDate }
    });
    console.log('Extratos em janeiro/2026:', extratosJaneiro.length);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

checkDatas();
