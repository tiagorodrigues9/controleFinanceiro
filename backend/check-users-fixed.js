const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
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

    // Verificar usuários
    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log('📊 Usuários encontrados:');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Nome: ${user.nome}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Password: ${user.password ? 'SIM' : 'NÃO'}`);
      console.log('');
    });

    // Tentar criar um usuário de teste
    console.log('🔧 Criando usuário de teste...');
    const User = mongoose.model('User');
    
    // Verificar se já existe
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('Usuário de teste já existe');
    } else {
      const testUser = new User({
        nome: 'Teste Dashboard',
        email: 'test@example.com',
        password: '123456'
      });
      await testUser.save();
      console.log('✅ Usuário de teste criado com senha: 123456');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
