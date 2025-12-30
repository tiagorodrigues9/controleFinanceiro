const logger = require('../utils/logger');

// Error handler middleware -> responde JSON padronizado
module.exports = (err, req, res, next) => {
  logger.error(err.stack || err.message || err);
  const status = err.status || 500;
  const payload = {
    success: false,
    message: err.message || 'Erro interno do servidor'
  };
  if (process.env.NODE_ENV === 'development') {
    payload.stack = err.stack;
  }
  res.status(status).json(payload);
};
