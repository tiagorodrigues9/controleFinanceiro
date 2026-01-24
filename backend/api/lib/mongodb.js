const mongoose = require('mongoose');
const { logger } = require('../../utils/logger');

let cachedConnection = null;

// Configuração do MongoDB para Vercel
const getMongoUri = () => {
  const mongoUser = process.env.MONGO_USER || '';
  const mongoPass = process.env.MONGO_PASS || '';
  const mongoDb = process.env.MONGO_DB || 'controle-financeiro';
  const mongoHost = process.env.MONGO_HOST || '';

  if (mongoUser && mongoPass && mongoHost) {
    // MongoDB Atlas (nuvem)
    const cleanHost = mongoHost.startsWith('@') ? mongoHost.substring(1) : mongoHost;
    return `mongodb+srv://${mongoUser}:${encodeURIComponent(mongoPass)}@${cleanHost}/${mongoDb}?retryWrites=true&w=majority`;
  } else if (mongoUser && mongoPass) {
    // MongoDB Local com autenticação
    return `mongodb://${mongoUser}:${encodeURIComponent(mongoPass)}@localhost:27017/${mongoDb}`;
  } else {
    // MongoDB Local sem autenticação
    return `mongodb://localhost:27017/${mongoDb}`;
  }
};

// Conexão com cache para serverless
const connectDB = async () => {
  if (cachedConnection && cachedConnection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const mongoUri = getMongoUri();
    
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000, // Reduzido para 3s
      socketTimeoutMS: 10000, // Reduzido para 10s
      maxPoolSize: 5, // Reduzido para serverless
      minPoolSize: 1,
      maxIdleTimeMS: 30000, // Fechar conexões ociosas após 30s
      connectTimeoutMS: 5000 // Timeout de conexão
    });

    cachedConnection = connection.connection;
    return cachedConnection;
  } catch (error) {
    throw error;
  }
};

module.exports = { connectDB };
