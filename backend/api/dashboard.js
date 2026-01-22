const { connectDB } = require('./lib/mongodb');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Models
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const Grupo = require('../models/Grupo');
const Cartao = require('../models/Cartao');

// Handler específico para dashboard
module.exports = async (req, res) => {
  // Configurar headers CORS primeiro, antes de qualquer coisa
  res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  // Configurar timeout para evitar problemas no Vercel
  req.setTimeout(8000);
  
  // Handle OPTIONS requests (preflight) - responder imediatamente SEM autenticação
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Aplicar middleware de autenticação apenas para outros métodos
  auth(req, res, async () => {
    try {
      // Conectar ao MongoDB
      await connectDB();
      
      // Extrair query params
      const url = req.url || '';
      const queryString = url.split('?')[1] || '';
      const params = new URLSearchParams(queryString);
      
      const mes = params.get('mes');
      const ano = params.get('ano');
      const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
      const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

      // Validação dos parâmetros
      if (isNaN(mesAtual) || mesAtual < 1 || mesAtual > 12) {
        return res.status(400).json({ message: 'Mês inválido. Deve estar entre 1 e 12.' });
      }

      if (isNaN(anoAtual) || anoAtual < 2020 || anoAtual > 2030) {
        return res.status(400).json({ message: 'Ano inválido. Deve estar entre 2020 e 2030.' });
      }

      const startDate = new Date(anoAtual, mesAtual - 1, 1);
      const endDate = new Date(anoAtual, mesAtual, 0, 23, 59, 59);

      // Filtro base para todas as queries
      const baseFilter = {
        usuario: req.user._id,
        ativo: { $ne: false }
      };

      console.log('=== DASHBOARD DEBUG ===');
      console.log('req.user._id:', req.user._id);
      console.log('mesAtual:', mesAtual, 'anoAtual:', anoAtual);
      console.log('startDate:', startDate);
      console.log('endDate:', endDate);

      // Contas a pagar
      const totalContasPagar = await Conta.countDocuments({
        ...baseFilter,
        status: { $in: ['Pendente', 'Vencida'] }
      });

      // Valor total de contas a pagar no mês
      const totalValorContasPagarMes = await Conta.aggregate([
        { 
          $match: { 
            ...baseFilter, 
            status: { $in: ['Pendente', 'Vencida'] }, 
            dataVencimento: { $gte: startDate, $lte: endDate } 
          } 
        },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);

      // Contas pendentes no mês
      const totalContasPendentesMes = await Conta.countDocuments({
        ...baseFilter,
        status: { $in: ['Pendente', 'Vencida'] },
        dataVencimento: { $gte: startDate, $lte: endDate }
      });

      // Contas pagas no mês
      const totalContasPagas = await Conta.countDocuments({
        ...baseFilter,
        status: 'Pago',
        dataPagamento: { $gte: startDate, $lte: endDate }
      });

      // Valor total de contas pagas no mês
      const totalValorContasPagas = await Conta.aggregate([
        { 
          $match: { 
            ...baseFilter, 
            status: 'Pago', 
            dataPagamento: { $gte: startDate, $lte: endDate } 
          } 
        },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);

      // Contas vencidas no mês
      const totalContasVencidas = await Conta.countDocuments({
        ...baseFilter,
        status: 'Vencida',
        dataVencimento: { $gte: startDate, $lte: endDate }
      });

      // Valor total de contas vencidas
      const totalValorContasVencidas = await Conta.aggregate([
        { $match: { ...baseFilter, status: 'Vencida' } },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);

      // Saldo total em contas bancárias
      const saldoTotalContas = await ContaBancaria.aggregate([
        { $match: { usuario: req.user._id, ativo: { $ne: false } } },
        { $group: { _id: null, total: { $sum: "$saldo" } } }
      ]);

      // Total de contas bancárias
      const totalContasBancarias = await ContaBancaria.countDocuments({
        usuario: req.user._id,
        ativo: { $ne: false }
      });

      // Gastos do mês
      const gastosMes = await Gasto.aggregate([
        {
          $match: {
            usuario: req.user._id,
            data: { $gte: startDate, $lte: endDate },
            ativo: { $ne: false }
          }
        },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);

      // Extrato do mês (entradas e saídas)
      const extratoMes = await Extrato.aggregate([
        {
          $match: {
            usuario: req.user._id,
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

      // Processar resultados do extrato
      let totalEntradas = 0;
      let totalSaidas = 0;

      extratoMes.forEach(item => {
        if (item._id === 'Entrada') {
          totalEntradas = item.total;
        } else if (item._id === 'Saída') {
          totalSaidas = item.total;
        }
      });

      // Montar resposta
      const dashboardData = {
        periodo: {
          mes: mesAtual,
          ano: anoAtual
        },
        contas: {
          totalPagar: totalContasPagar,
          valorPagarMes: totalValorContasPagarMes[0]?.total || 0,
          pendentesMes: totalContasPendentesMes,
          pagasMes: totalContasPagas,
          valorPagasMes: totalValorContasPagas[0]?.total || 0,
          vencidasMes: totalContasVencidas,
          valorVencidas: totalValorContasVencidas[0]?.total || 0
        },
        financeiro: {
          saldoTotal: saldoTotalContas[0]?.total || 0,
          totalContasBancarias: totalContasBancarias,
          totalGastosMes: gastosMes[0]?.total || 0,
          totalEntradasMes: totalEntradas,
          totalSaidasMes: totalSaidas,
          saldoMes: totalEntradas - totalSaidas
        },
        timestamp: new Date().toISOString()
      };

      console.log('Dashboard data gerada:', JSON.stringify(dashboardData, null, 2));
      
      res.json(dashboardData);
      
    } catch (error) {
      console.error('Erro no handler do dashboard:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
};
