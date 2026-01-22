const mongoose = require('mongoose');
require('dotenv').config();

// Models
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const auth = require('../middleware/auth');

// Handler específico para dashboard - VERSÃO CORRIGIDA
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

      // Criar datas para o período correto usando strings ISO
      const startDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01T12:00:00.000Z`);
      const endDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-31T12:00:00.000Z`);
      
      console.log('DEBUG - startDate:', startDate.toISOString());
      console.log('DEBUG - endDate:', endDate.toISOString());

      console.log('=== DASHBOARD DEBUG CORRIGIDO ===');
      console.log('req.user._id:', req.user._id);
      console.log('mesAtual:', mesAtual, 'anoAtual:', anoAtual);
      console.log('startDate:', startDate);
      console.log('endDate:', endDate);

      // Filtro base para todas as queries
      const baseFilter = {
        usuario: new mongoose.Types.ObjectId(req.user._id)
      };

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

      // Saldo total em contas bancárias
      const saldoTotalContas = await ContaBancaria.aggregate([
        { $match: { usuario: req.user._id } },
        { $group: { _id: null, total: { $sum: "$saldo" } } }
      ]);

      // Total de contas bancárias
      const totalContasBancarias = await ContaBancaria.countDocuments({
        usuario: req.user._id
      });

      // Gastos do mês
      console.log('DEBUG - Buscando gastos com filtro:', {
        usuario: new mongoose.Types.ObjectId(req.user._id),
        data: { $gte: startDate, $lte: endDate }
      });
      
      const gastosMes = await Gasto.aggregate([
        {
          $match: {
            usuario: new mongoose.Types.ObjectId(req.user._id),
            data: { $gte: startDate, $lte: endDate }
          }
        },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);

      console.log('gastosMes:', gastosMes);

      // Extrato do mês (entradas e saídas)
      console.log('DEBUG - Buscando extratos com filtro:', {
        usuario: new mongoose.Types.ObjectId(req.user._id),
        data: { $gte: startDate, $lte: endDate }
      });
      
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

      console.log('extratoMes:', extratoMes);

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
          pagasMes: totalContasPagas,
          valorPagasMes: totalValorContasPagas[0]?.total || 0
        },
        financeiro: {
          saldoTotal: saldoTotalContas[0]?.total || 0,
          totalContasBancarias: totalContasBancarias,
          totalGastosMes: gastosMes[0]?.total || 0,
          totalEntradasMes: totalEntradas,
          totalSaidasMes: totalSaidas,
          saldoMes: totalEntradas - totalSaidas
        },
        // Campos diretos para compatibilidade com frontend
        totalGastosMes: gastosMes[0]?.total || 0,
        totalEntradasMes: totalEntradas,
        totalSaidasMes: totalSaidas,
        saldoMes: totalEntradas - totalSaidas,
        timestamp: new Date().toISOString()
      };

      console.log('Dashboard data gerada (CORRIGIDA):', JSON.stringify(dashboardData, null, 2));
      
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
