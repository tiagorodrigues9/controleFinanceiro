// Middleware para tratar valores NaN em queries
const sanitizeNumericFields = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'number' && isNaN(value)) {
      return 0;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    Object.keys(obj).forEach(key => {
      if (key === 'valor') {
        obj[key] = sanitizeValue(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    });
    
    return obj;
  };

  // Sanitizar query params
  if (req.query) {
    sanitizeObject(req.query);
  }

  // Sanitizar body
  if (req.body) {
    sanitizeObject(req.body);
  }

  next();
};

module.exports = sanitizeNumericFields;
