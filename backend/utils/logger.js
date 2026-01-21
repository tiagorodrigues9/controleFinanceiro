const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'controle-financeiro' },
  transports: [
    // Arquivo de logs de erro
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Arquivo de logs combinados
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Em desenvolvimento, também log no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.simple()
    )
  }));
}

// Logger específico para erros de API
const logApiError = (error, req, additionalInfo = {}) => {
  logger.error('API Error', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  });
};

// Logger para performance
const logPerformance = (operation, duration, additionalInfo = {}) => {
  if (duration > 1000) { // Log apenas se levar mais de 1 segundo
    logger.warn('Slow Operation', {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      ...additionalInfo
    });
  }
};

// Logger para eventos de negócio
const logBusinessEvent = (event, data) => {
  logger.info('Business Event', {
    event,
    data,
    timestamp: new Date().toISOString()
  });
};

// Logger para segurança
const logSecurityEvent = (event, req, additionalInfo = {}) => {
  logger.warn('Security Event', {
    event,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?._id,
    timestamp: new Date().toISOString(),
    ...additionalInfo
  });
};

module.exports = {
  logger,
  logApiError,
  logPerformance,
  logBusinessEvent,
  logSecurityEvent
};
