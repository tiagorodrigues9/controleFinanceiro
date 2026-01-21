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
    logger.info('Usando conexão MongoDB em cache');
    return cachedConnection;
  }

  try {
    const mongoUri = getMongoUri();
    logger.info('Conectando ao MongoDB...');
    
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10, // Reduzido para serverless
      bufferCommands: false,
      bufferMaxEntries: 0
    });

    cachedConnection = connection.connection;
    logger.info('MongoDB conectado com sucesso');
    return cachedConnection;
  } catch (error) {
    logger.error('Erro ao conectar MongoDB:', error);
    throw error;
  }
};

module.exports = { connectDB };
