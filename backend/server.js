require('express-async-errors');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { keepAlive } = require('./utils/keepAlive');

const app = express();

// Middleware
app.use(cors());
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
      dashboard: '/api/dashboard'
    }
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
app.use('/api/formas-pagamento', require('./routes/formas-pagamento'));
app.use('/api/cartoes', require('./routes/cartoes'));
app.use('/api/notificacoes', require('./routes/notificacoes'));

// Conexão com MongoDB
const mongoUser = process.env.MONGO_USER || '';
const mongoPass = process.env.MONGO_PASS || '';
const mongoDb = process.env.MONGO_DB || 'controle-financeiro';
const mongoHost = process.env.MONGO_HOST || '';

// Debug - mostra as variáveis lidas (sem mostrar senha completa)
logger.info('\n=== Configuração MongoDB ===');
logger.info('MONGO_USER: %s', mongoUser || '(não configurado)');
logger.info('MONGO_PASS: %s', mongoPass ? '***configurado***' : '(não configurado)');
logger.info('MONGO_DB: %s', mongoDb);
logger.info('MONGO_HOST: %s', mongoHost || '(não configurado)');
logger.info('============================\n');

// Constrói a URI do MongoDB
let mongoUri;
if (mongoUser && mongoPass && mongoHost) {
  // MongoDB Atlas (nuvem) - usa mongodb+srv
  // Remove @ do início do host se existir
  const cleanHost = mongoHost.startsWith('@') ? mongoHost.substring(1) : mongoHost;
  mongoUri = `mongodb+srv://${mongoUser}:${encodeURIComponent(mongoPass)}@${cleanHost}/${mongoDb}?retryWrites=true&w=majority`;
  console.log('✅ Modo: MongoDB Atlas (nuvem)');
} else if (mongoUser && mongoPass) {
  // MongoDB Local com autenticação
  mongoUri = `mongodb://${mongoUser}:${encodeURIComponent(mongoPass)}@localhost:27017/${mongoDb}`;
  console.log('⚠️  Modo: MongoDB Local (com autenticação)');
  console.log('⚠️  ATENÇÃO: Se você usa MongoDB Atlas, adicione MONGO_HOST no .env!');
} else {
  // MongoDB Local sem autenticação
  mongoUri = `mongodb://localhost:27017/${mongoDb}`;
  console.log('⚠️  Modo: MongoDB Local (sem autenticação)');
  console.log('⚠️  ATENÇÃO: Se você usa MongoDB Atlas, configure MONGO_USER, MONGO_PASS e MONGO_HOST no .env!');
}

console.log('URI do MongoDB:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Esconde a senha no log
console.log('');

mongoose.connect(mongoUri)
.then(() => {
  logger.info('MongoDB conectado');
  
  // Iniciar agendador de notificações após conectar ao MongoDB
  const NotificationScheduler = require('./schedulers/NotificationScheduler');
  NotificationScheduler.iniciar();
})
.catch(err => logger.error('Erro ao conectar MongoDB:', err));

const PORT = process.env.PORT || 5000;
app.use(errorHandler);
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
});

