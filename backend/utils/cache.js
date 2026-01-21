const NodeCache = require('node-cache');
const { logger } = require('./logger');

// Cache com TTL de 5 minutos para dados do dashboard
const dashboardCache = new NodeCache({ 
  stdTTL: 300, // 5 minutos
  checkperiod: 60, // Verifica itens expirados a cada 60 segundos
  useClones: false // Melhor performance
});

// Cache com TTL de 10 minutos para dados estáticos
const staticCache = new NodeCache({ 
  stdTTL: 600, // 10 minutos
  checkperiod: 120
});

const cacheMiddleware = (cacheType = 'dashboard') => {
  return (req, res, next) => {
    const cache = cacheType === 'static' ? staticCache : dashboardCache;
    const key = generateCacheKey(req);
    
    const cachedData = cache.get(key);
    if (cachedData) {
      logger.info('Cache hit', { key, cacheType });
      return res.json(cachedData);
    }
    
    // Adiciona método ao response para salvar no cache
    res.cacheData = (data, customTTL) => {
      cache.set(key, data, customTTL);
      logger.info('Data cached', { key, cacheType, ttl: customTTL || cache.options.stdTTL });
    };
    
    next();
  };
};

const generateCacheKey = (req) => {
  const userId = req.user._id;
  const path = req.originalUrl;
  const query = JSON.stringify(req.query);
  return `${userId}:${path}:${query}`;
};

const invalidateUserCache = (userId) => {
  const keys = dashboardCache.keys().filter(key => key.startsWith(`${userId}:`));
  keys.forEach(key => dashboardCache.del(key));
  
  const staticKeys = staticCache.keys().filter(key => key.startsWith(`${userId}:`));
  staticKeys.forEach(key => staticCache.del(key));
  
  logger.info('User cache invalidated', { userId, keysDeleted: keys.length + staticKeys.length });
};

const getCacheStats = () => {
  return {
    dashboard: dashboardCache.getStats(),
    static: staticCache.getStats()
  };
};

module.exports = {
  dashboardCache,
  staticCache,
  cacheMiddleware,
  generateCacheKey,
  invalidateUserCache,
  getCacheStats
};
