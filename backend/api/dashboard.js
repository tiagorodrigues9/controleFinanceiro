const { connectDB } = require('./lib/mongodb');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Models
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const Grupo = require('../models/Grupo');
const Cartao = require('../models/Cartao');

// Middleware de autenticação simplificado para Vercel
const auth = async (req, res, next) => {
  try {
    const token = req.headers && req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded.id,
      email: decoded.email || 'user@example.com'
    };
    
    next();
  } catch (error) {
    console.error('❌ Auth Error:', error.message);
    res.status(401).json({ message: 'Token inválido.' });
  }
};

// Handler principal do dashboard para Vercel
const dashboardHandler = async (req, res) => {
  try {
    console.log('=== DASHBOARD DEBUG (VERCEL) ===');
    console.log('req.method:', req.method);
    console.log('req.query:', req.query);
    
    if (req.method !== 'GET') {
      return res.status(405).json({ message: 'Método não permitido' });
    }

    const { mes, ano } = req.query;
    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

    // Validação dos parâmetros
    if (isNaN(mesAtual) || mesAtual < 1 || mesAtual > 12) {
      return res.status(400).json({ message: 'Mês inválido. Deve estar entre 1 e 12.' });
    }

    if (isNaN(anoAtual) || anoAtual < 2020 || anoAtual > 2030) {
      return res.status(400).json({ message: 'Ano inválido. Deve estar entre 2020 e 2030.' });
    }

    // Criar datas para o período correto
    const startDate = new Date(anoAtual, mesAtual - 1, 1);
    const endDate = new Date(anoAtual, mesAtual, 0, 23, 59, 59);
    const nextMonthStart = new Date(anoAtual, mesAtual, 1);
    const nextMonthEnd = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59);

    // Filtro base para todas as queries - CORRIGIDO COM ObjectId
    const baseFilter = {
      usuario: new mongoose.Types.ObjectId(req.user._id)
    };

    // Contas a pagar no mês (corrigido)
    const totalContasPagar = await Conta.countDocuments({
      ...baseFilter,
      status: { $in: ['Pendente', 'Vencida'] },
      dataVencimento: { $gte: startDate, $lte: endDate }
    });

    // Valor total de contas a pagar no mês (corrigido)
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
      { 
        $match: { 
          ...baseFilter, 
          status: 'Vencida',
          dataVencimento: { $gte: startDate, $lte: endDate }
        } 
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);

    // Contas do próximo mês
    const totalContasNextMonth = await Conta.countDocuments({
      ...baseFilter,
      status: 'Pendente',
      dataVencimento: { $gte: nextMonthStart, $lte: nextMonthEnd }
    });

    // Valor total de contas do próximo mês
    const totalValorContasNextMonth = await Conta.aggregate([
      {
        $match: {
          ...baseFilter,
          status: 'Pendente',
          dataVencimento: { $gte: nextMonthStart, $lte: nextMonthEnd }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);

    // Montar resposta
    const responseData = {
      totalContasPagar,
      totalValorContasPagarMes: totalValorContasPagarMes[0]?.total || 0,
      totalContasPendentesMes,
      totalContasPagas,
      totalValorContasPagas: totalValorContasPagas[0]?.total || 0,
      totalContasVencidas,
      totalValorContasVencidas: totalValorContasVencidas[0]?.total || 0,
      totalContasNextMonth,
      totalValorContasNextMonth: totalValorContasNextMonth[0]?.total || 0,
      totalContasMes: totalContasPagar + totalContasPagas,
      totalValorContasPendentes: totalValorContasPagarMes[0]?.total || 0,
      totalGastosMes: 0,
      totalEntradasMes: 0,
      totalSaidasMes: 0,
      saldoMes: 0,
      financeiro: {
        totalGastosMes: 0,
        totalEntradasMes: 0,
        totalSaidasMes: 0,
        saldoMes: 0
      },
      mesesComparacao: [],
      tipoDespesaMaisGasto: [],
      evolucaoSaldo: [],
      percentualPorCategoria: [],
      relatorioTiposDespesa: [],
      graficoBarrasTiposDespesa: [],
      graficoPizzaTiposDespesa: [],
      relatorioCartoes: [],
      relatorioFormasPagamento: []
    };

    res.json(responseData);
  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard' });
  }
};

// Handler para Vercel - Dashboard
module.exports = async (req, res) => {
  // Configurar headers CORS primeiro, antes de qualquer coisa
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Aplicar middleware de autenticação
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Usar o handler do dashboard
    return dashboardHandler(req, res);
    
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
