const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

// Configuração CORS para Vercel
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento, permitir qualquer origem local
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Lista de origens permitidas (ajustar para frontend no Vercel)
    const allowedOrigins = [
      'https://controle-financeiro-web.onrender.com',
      'https://controlefinanceiro-i7s6.onrender.com',
      'http://localhost:3000',
      'http://localhost:3001',
      // Adicionar domínio do frontend no Vercel quando disponível
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 horas
};

// Rate limiting para serverless
const createLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    // Configurações específicas para Vercel
    keyGenerator: (req) => {
      return req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.ip;
    }
  });
};

const generalLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutos
  100, // Reduzido para serverless
  'Muitas requisições deste IP, tente novamente mais tarde'
);

const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutos
  5, // limite para auth
  'Muitas tentativas de login, tente novamente mais tarde'
);

// Security headers para serverless
const securityHeaders = (req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  // HSTS apenas em produção com HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
};

const setupMiddleware = (app) => {
  app.use(cors(corsOptions));
  app.use(securityHeaders);
  app.use('/api/', generalLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
};

module.exports = {
  setupMiddleware,
  corsOptions,
  generalLimiter,
  authLimiter
};
