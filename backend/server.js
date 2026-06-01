require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { keepAlive } = require('./utils/keepAlive');
const { initCronJobs } = require('./jobs/cronJobs');
const ensureDb = require('./middleware/ensureDb');
const { connectDB } = require('./utils/db');
const { isServerless } = require('./utils/mongoConfig');

const app = express();

const helmet = require('helmet');

// Ativar Helmet para security headers (substitui headers manuais)
app.use(helmet());

// Lista de origens permitidas
const allowedOrigins = [
  'https://controlefinanceiro-i7s6.onrender.com',
  'https://controle-financeiro-backend1.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Em desenvolvimento, permitir qualquer origem local
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Frontends hospedados na Vercel (preview e produção)
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
      return callback(null, true);
    }

    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    logger.warn('CORS blocked', { origin });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));
// Confiar no proxy reverso (Vercel, Render, etc.)
app.set('trust proxy', 1);

// Rate limiting básico
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // limite cada IP a 1000 requisições por windowMs
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

app.use('/api/', limiter);

// Conectar ao MongoDB antes de qualquer rota da API (crítico na Vercel)
app.use('/api', ensureDb);

// Limitador mais restrito para auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite cada IP a 100 tentativas de login por windowMs (desenvolvimento)
  message: 'Muitas tentativas de login, tente novamente mais tarde',
  skipSuccessfulRequests: true,
  validate: { xForwardedForHeader: false },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rota raiz
app.get('/', (req, res) => {
  res.json({ 
    message: 'API do Controle Financeiro está rodando!',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      contas: '/api/contas',
      fornecedores: '/api/fornecedores',
      gastos: '/api/gastos',
      contasBancarias: '/api/contas-bancarias',
      grupos: '/api/grupos',
      extrato: '/api/extrato',
      dashboard: '/api/dashboard',
      transferencias: '/api/transferencias'
    }
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  let database = 'disconnected';
  try {
    await connectDB();
    database = 'connected';
  } catch {
    database = 'disconnected';
  }

  const healthCheck = {
    uptime: process.uptime(),
    message: database === 'connected' ? 'OK' : 'DEGRADED',
    timestamp: Date.now(),
    database,
    environment: process.env.NODE_ENV || 'development',
  };

  res.status(database === 'connected' ? 200 : 503).json(healthCheck);
});

// Ping endpoint (fallback)
app.get('/ping', (req, res) => {
  res.json({ 
    message: 'pong',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contas', require('./routes/contas'));
app.use('/api/fornecedores', require('./routes/fornecedores'));
app.use('/api/gastos', require('./routes/gastos'));
app.use('/api/contas-bancarias', require('./routes/contasBancarias'));
app.use('/api/grupos', require('./routes/grupos'));
app.use('/api/extrato', require('./routes/extrato'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/transferencias', require('./routes/transferencias'));
app.use('/api/formas-pagamento', require('./routes/formas-pagamento'));
app.use('/api/cartoes', require('./routes/cartoes'));
app.use('/api/fatura-cartao', require('./routes/faturaCartao'));
app.use('/api/dashboard-faturas', require('./routes/dashboardFaturas'));
app.use('/api/notificacoes', require('./routes/notificacoes'));
app.use('/api/emails', require('./routes/emails'));
app.use('/api/email-test', require('./routes/emailTest'));
app.use('/api/exportar', require('./routes/exportar'));
app.use('/api/orcamentos', require('./routes/orcamentos'));

// Swagger UI
const setupSwagger = require('./swagger');
setupSwagger(app);

// Pré-aquecer conexão em servidor long-running (não bloqueia serverless)
if (!isServerless()) {
  connectDB()
    .then(() => {
      logger.info('MongoDB conectado com sucesso via Mongoose');
      initCronJobs();
    })
    .catch((err) => {
      logger.error('Erro ao conectar MongoDB:', err);
    });
}

// Eventos de conexão para monitoramento
mongoose.connection.on('connected', () => {
  logger.info('Mongoose conectado ao MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Erro na conexão Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose desconectado do MongoDB');
});

mongoose.connection.on('reconnected', () => {
  logger.info('Mongoose reconectado ao MongoDB');
});

mongoose.connection.on('reconnectFailed', () => {
  logger.error('Falha na reconexão do Mongoose');
});

const http = require('http');
const socket = require('./utils/socket');

const PORT = process.env.PORT || 5000;
app.use(errorHandler);

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // Iniciar agendador de notificações
  const NotificationScheduler = require('./schedulers/NotificationScheduler');
  NotificationScheduler.iniciar();

  const server = http.createServer(app);
  
  // Iniciar WebSocket
  const io = socket.init(server);
  io.on('connection', (socketConn) => {
    logger.info(`Novo cliente WebSocket conectado: ${socketConn.id}`);
    
    // Autenticar sala do usuário
    socketConn.on('join_user_room', (userId) => {
      socketConn.join(userId);
      logger.info(`WebSocket ${socketConn.id} entrou na sala ${userId}`);
    });

    socketConn.on('disconnect', () => {
      logger.info(`Cliente WebSocket desconectado: ${socketConn.id}`);
    });
  });

  server.listen(PORT, () => {
    logger.info(`Servidor rodando na porta ${PORT}`);
  });
}

module.exports = app;
