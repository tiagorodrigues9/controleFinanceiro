const { connectDB } = require('../utils/db');
const { logger } = require('../utils/logger');

/**
 * Garante conexão com MongoDB antes de rotas /api (obrigatório na Vercel).
 */
async function ensureDb(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (error) {
    logger.error('MongoDB indisponível', { path: req.path, error: error.message });
    res.status(503).json({
      message: 'Banco de dados temporariamente indisponível. Tente novamente em alguns segundos.',
      code: 'DB_UNAVAILABLE',
    });
  }
}

module.exports = ensureDb;
