const mongoose = require('mongoose');
const { buildMongoUri, getMongooseOptions } = require('./mongoConfig');
const { logger } = require('./logger');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Reutiliza conexão Mongoose entre invocações serverless (Vercel).
 */
async function connectDB() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (mongoose.connection.readyState === 2 && cached.promise) {
    return cached.promise;
  }

  if (!cached.promise) {
    const uri = buildMongoUri();
    const options = getMongooseOptions();

    mongoose.set('strictQuery', false);

    cached.promise = mongoose
      .connect(uri, options)
      .then((m) => {
        cached.conn = m;
        logger.info('MongoDB conectado', {
          serverless: Boolean(process.env.VERCEL),
          readyState: mongoose.connection.readyState,
        });
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        logger.error('Falha ao conectar MongoDB', { error: err.message });
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

function resetConnectionCache() {
  cached.conn = null;
  cached.promise = null;
}

module.exports = { connectDB, resetConnectionCache };
