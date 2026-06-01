const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Reutiliza conexão Mongoose entre invocações serverless (Vercel).
 */
async function connectDB(uri, options = {}) {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, options).then((m) => {
      cached.conn = m;
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }

  return cached.conn;
}

function resetConnectionCache() {
  cached.conn = null;
  cached.promise = null;
}

module.exports = { connectDB, resetConnectionCache };
