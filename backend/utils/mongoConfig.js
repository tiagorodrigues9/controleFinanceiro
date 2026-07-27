/**
 * Configuração centralizada do MongoDB (local, Atlas, Vercel serverless).
 */
function buildMongoUri() {
  // Suporte a URI completa (Docker, ambientes customizados)
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }

  const mongoUser = process.env.MONGO_USER || '';
  const mongoPass = process.env.MONGO_PASS || '';
  const mongoDb = process.env.MONGO_DB || 'controle-financeiro';
  const mongoHost = process.env.MONGO_HOST || '';

  if (mongoUser && mongoPass && mongoHost) {
    const cleanHost = mongoHost.startsWith('@') ? mongoHost.substring(1) : mongoHost;
    return `mongodb+srv://${mongoUser}:${encodeURIComponent(mongoPass)}@${cleanHost}/${mongoDb}?retryWrites=true&w=majority`;
  }

  if (mongoUser && mongoPass) {
    return `mongodb://${mongoUser}:${encodeURIComponent(mongoPass)}@127.0.0.1:27017/${mongoDb}`;
  }

  return `mongodb://127.0.0.1:27017/${mongoDb}`;
}

function isServerless() {
  return Boolean(process.env.VERCEL);
}

function getMongooseOptions() {
  if (isServerless()) {
    return {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      bufferCommands: false,
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      retryWrites: true,
      w: 'majority',
    };
  }

  return {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    bufferCommands: true,
    bufferTimeoutMS: 30000,
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    retryWrites: true,
    w: 'majority',
  };
}

module.exports = { buildMongoUri, getMongooseOptions, isServerless };
