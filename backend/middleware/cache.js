const cache = new Map();

// Cache simples em memória para dashboard
const cacheMiddleware = (ttl = 5 * 60 * 1000) => { // 5 minutos padrão
  return (req, res, next) => {
    // Apenas cache para GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Gerar chave de cache baseada na URL e usuário
    const cacheKey = `${req.originalUrl}:${req.user._id}`;
    
    // Verificar se tem cache válido
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      console.log(`Cache hit para ${cacheKey}`);
      return res.json(cached.data);
    }

    // Intercepta o res.json para salvar no cache
    const originalJson = res.json;
    res.json = function(data) {
      // Salvar no cache
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      console.log(`Cache set para ${cacheKey}`);
      
      // Chamar o método original
      return originalJson.call(this, data);
    };

    next();
  };
};

// Limpar cache específico
const clearCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Limpar todo o cache
const clearAllCache = () => {
  cache.clear();
};

// Limpar cache expirado periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutos
      cache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Verificar a cada 5 minutos

module.exports = {
  cacheMiddleware,
  clearCache,
  clearAllCache
};
