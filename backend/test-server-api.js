const express = require('express');
const cors = require('cors');
const dashboardHandler = require('./api/dashboard.js');

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'https://controlefinanceiro-i7s6.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true
}));

app.use(express.json());

// Rota dashboard usando o handler do api/dashboard.js
app.use('/api/dashboard', dashboardHandler);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Servidor de teste rodando!' });
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Servidor de teste rodando na porta ${PORT}`);
});
