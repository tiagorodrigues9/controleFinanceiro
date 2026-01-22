const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const auth = require('../middleware/auth');

// Handler simplificado para dashboard
module.exports = async (req, res) => {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Aplicar autenticação
  auth(req, res, async () => {
    try {
      console.log('=== DASHBOARD SIMPLES ===');
      console.log('User ID:', req.user._id);
      
      // Conectar ao MongoDB
      const mongoUser = process.env.MONGO_USER || '';
      const mongoPass = process.env.MONGO_PASS || '';
      const mongoDb = process.env.MONGO_DB || 'controle-financeiro';
      const mongoHost = process.env.MONGO_HOST || '';

      let mongoUri;
      if (mongoUser && mongoPass && mongoHost) {
        const cleanHost = mongoHost.startsWith('@') ? mongoHost.substring(1) : mongoHost;
        mongoUri = `mongodb+srv://${mongoUser}:${encodeURIComponent(mongoPass)}@${cleanHost}/${mongoDb}?retryWrites=true&w=majority`;
      } else {
        mongoUri = `mongodb://localhost:27017/${mongoDb}`;
      }

      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(mongoUri);
      }
      
      // Extrair parâmetros
      const url = req.url || '';
      const queryString = url.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      
      const mes = params.get('mes');
      const ano = params.get('ano');
      const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
      const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

      console.log('Mês/Ano:', mesAtual, anoAtual);

      // Criar datas para o período correto
      const startDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01T12:00:00.000Z`);
      const endDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-31T12:00:00.000Z`);
      
      console.log('Período:', startDate.toISOString(), 'a', endDate.toISOString());

      // Buscar gastos do mês
      const gastosMes = await Gasto.aggregate([
        {
          $match: {
            usuario: new mongoose.Types.ObjectId(req.user._id),
            data: { $gte: startDate, $lte: endDate }
          }
        },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);

      // Buscar extratos do mês
      const extratoMes = await Extrato.aggregate([
        {
          $match: {
            usuario: new mongoose.Types.ObjectId(req.user._id),
            data: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: "$tipo",
            total: { $sum: "$valor" }
          }
        }
      ]);

      // Processar extratos
      let totalEntradas = 0;
      let totalSaidas = 0;

      extratoMes.forEach(item => {
        if (item._id === 'Entrada') {
          totalEntradas = item.total;
        } else if (item._id === 'Saída') {
          totalSaidas = item.total;
        }
      });

      // Buscar contas bancárias
      const contasBancarias = await ContaBancaria.find({ usuario: req.user._id });

      // Montar resposta
      const dashboardData = {
        periodo: {
          mes: mesAtual,
          ano: anoAtual
        },
        totalGastosMes: gastosMes[0]?.total || 0,
        totalEntradasMes: totalEntradas,
        totalSaidasMes: totalSaidas,
        saldoMes: totalEntradas - totalSaidas,
        totalContasBancarias: contasBancarias.length,
        contasBancarias: contasBancarias.map(conta => ({
          nome: conta.nome,
          saldo: conta.saldo,
          banco: conta.banco
        })),
        timestamp: new Date().toISOString()
      };

      console.log('Dashboard Data:', JSON.stringify(dashboardData, null, 2));
      
      res.json(dashboardData);
      
    } catch (error) {
      console.error('Erro no dashboard simples:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
};
