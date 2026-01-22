const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Extrato = require('./models/Extrato');
const ContaBancaria = require('./models/ContaBancaria');

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

async function testDashboard() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Conectado ao MongoDB');

    // Verificar se há usuários
    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log('📊 Total de usuários:', users.length);
    
    if (users.length > 0) {
      const firstUser = users[0];
      console.log('👤 Primeiro usuário ID:', firstUser._id);
      
      // Verificar contas
      const contas = await Conta.find({ usuario: firstUser._id });
      console.log('📄 Total de contas:', contas.length);
      
      // Verificar gastos
      const gastos = await Gasto.find({ usuario: firstUser._id });
      console.log('💰 Total de gastos:', gastos.length);
      
      // Verificar extrato
      const extrato = await Extrato.find({ usuario: firstUser._id });
      console.log('📋 Total de extratos:', extrato.length);
      
      // Verificar contas bancárias
      const contasBancarias = await ContaBancaria.find({ usuario: firstUser._id });
      console.log('🏦 Total de contas bancárias:', contasBancarias.length);
      
      // Mostrar alguns dados de exemplo
      if (contas.length > 0) {
        console.log('\n📄 Exemplo de conta:');
        console.log('  Nome:', contas[0].nome);
        console.log('  Valor:', contas[0].valor);
        console.log('  Status:', contas[0].status);
        console.log('  Data Vencimento:', contas[0].dataVencimento);
        console.log('  Ativo:', contas[0].ativo);
      }
      
      if (gastos.length > 0) {
        console.log('\n💰 Exemplo de gasto:');
        console.log('  Descrição:', gastos[0].descricao);
        console.log('  Valor:', gastos[0].valor);
        console.log('  Data:', gastos[0].data);
      }
      
      // Testar filtros do dashboard
      const startDate = new Date(2025, 0, 1); // Janeiro 2025
      const endDate = new Date(2025, 0, 31, 23, 59, 59);
      
      console.log('\n🔍 Testando filtros do dashboard:');
      console.log('  Período:', startDate, 'a', endDate);
      
      const contasMes = await Conta.find({
        usuario: firstUser._id,
        dataVencimento: { $gte: startDate, $lte: endDate }
      });
      console.log('  Contas do mês:', contasMes.length);
      
      const gastosMes = await Gasto.find({
        usuario: firstUser._id,
        data: { $gte: startDate, $lte: endDate }
      });
      console.log('  Gastos do mês:', gastosMes.length);
      
      // Testar filtro com ativo
      const contasAtivas = await Conta.find({
        usuario: firstUser._id,
        ativo: { $ne: false }
      });
      console.log('  Contas com filtro ativo:', contasAtivas.length);
      
      const contasTodas = await Conta.find({
        usuario: firstUser._id
      });
      console.log('  Contas sem filtro ativo:', contasTodas.length);
      
    } else {
      console.log('⚠️ Nenhum usuário encontrado no banco');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

testDashboard();
