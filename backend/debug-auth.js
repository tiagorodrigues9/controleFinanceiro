const jwt = require('jsonwebtoken');
require('dotenv').config();

async function debugAuth() {
  try {
    // Fazer login para pegar o token
    const axios = require('axios');
    
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'tr364634@gmail.com',
      password: '194850Actdf!'
    });
    
    const token = loginResponse.data.token;
    console.log('🔐 Token obtido:', token.substring(0, 50) + '...');
    
    // Decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('👤 Usuário no JWT:', decoded);
    console.log('👤 ID no JWT:', decoded.id);
    console.log('👤 Email no JWT:', decoded.email);
    
    // Verificar no MongoDB
    const mongoose = require('mongoose');
    const User = require('./models/User');
    
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
    
    const userFromDB = await User.findById(decoded.id);
    console.log('👤 Usuário no MongoDB:', userFromDB);
    
    if (userFromDB) {
      console.log('👤 Email no MongoDB:', userFromDB.email);
      console.log('🔍 IDs correspondem?', decoded.id.toString() === userFromDB._id.toString());
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

debugAuth();
