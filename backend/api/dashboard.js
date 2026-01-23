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

    // Gastos do mês
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: req.user._id,
          data: { $gte: startDate, $lte: endDate }
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

    // Calcular totais do mês
    const totalGastosMesValor = gastosMes[0]?.total || 0;
    const totalEntradasMesValor = totalEntradas;
    const totalSaidasMesValor = totalSaidas;
    const saldoMesValor = totalEntradas - totalSaidas;

    // Comparação últimos 6 meses
    const mesesComparacao = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const mesRef = new Date(anoAtual, mesAtual - 1 - i, 1);
        const mesRefEnd = new Date(anoAtual, mesAtual - i, 0, 23, 59, 59);
        
        // Query para contas
        const contasMes = await Conta.aggregate([
          { 
            $match: { 
              usuario: new mongoose.Types.ObjectId(req.user._id),
              status: 'Pago',
              $or: [
                { dataPagamento: { $gte: mesRef, $lte: mesRefEnd } },
                { dataVencimento: { $gte: mesRef, $lte: mesRefEnd } }
              ]
            } 
          },
          { $group: { _id: null, total: { $sum: "$valor" } } }
        ]);
        
        // Query para gastos
        const gastosMes = await Gasto.aggregate([
          { 
            $match: { 
              usuario: new mongoose.Types.ObjectId(req.user._id),
              data: { $gte: mesRef, $lte: mesRefEnd }
            } 
          },
          { $group: { _id: null, total: { $sum: "$valor" } } }
        ]);
        
        const totalContas = contasMes.length > 0 ? contasMes[0].total : 0;
        const totalGastos = gastosMes.length > 0 ? gastosMes[0].total : 0;
        
        return {
          mes: mesRef.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
          contas: totalContas,
          gastos: totalGastos,
          total: totalContas + totalGastos
        };
      })
    );
    
    mesesComparacao.reverse();

    // Tipo de despesa com mais gasto
    const gastos = await Gasto.find({
      usuario: req.user._id,
      data: { $gte: startDate, $lte: endDate }
    }).populate('tipoDespesa.grupo');

    // Agrupar gastos por categoria
    const gastosPorCategoria = {};
    gastos.forEach(gasto => {
      const categoria = gasto.tipoDespesa?.grupo?.nome || 'Sem Categoria';
      if (!gastosPorCategoria[categoria]) {
        gastosPorCategoria[categoria] = 0;
      }
      gastosPorCategoria[categoria] += gasto.valor;
    });

    // Encontrar categoria com maior gasto
    let tipoDespesaMaisGasto = [];
    Object.entries(gastosPorCategoria).forEach(([categoria, valor]) => {
      tipoDespesaMaisGasto.push({ categoria, valor });
    });
    tipoDespesaMaisGasto.sort((a, b) => b.valor - a.valor);
    tipoDespesaMaisGasto = tipoDespesaMaisGasto.slice(0, 5); // Top 5

    // Evolução do saldo das contas bancárias
    const contasBancarias = await ContaBancaria.find({ usuario: req.user._id });
    
    // Criar range dos últimos 6 meses
    const monthsRange = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(anoAtual, mesAtual - 1 - i, 1);
      const monthEnd = new Date(anoAtual, mesAtual - i, 0, 23, 59, 59);
      monthsRange.push(monthEnd);
    }

    const evolucaoSaldo = await Promise.all(
      contasBancarias.map(async (conta) => {
        const saldos = await Promise.all(
          monthsRange.map(async (monthEnd) => {
            const saldo = await Extrato.aggregate([
              {
                $match: {
                  usuario: req.user._id,
                  contaBancaria: conta._id,
                  data: { $lte: monthEnd }
                }
              },
              {
                $group: {
                  _id: "$tipo",
                  total: { $sum: "$valor" }
                }
              }
            ]);

            let entradas = 0;
            let saidas = 0;
            saldo.forEach(item => {
              if (item._id === 'Entrada') entradas = item.total;
              if (item._id === 'Saída') saidas = item.total;
            });

            return entradas - saidas;
          })
        );

        return {
          nomeConta: conta.nome,
          saldos: saldos
        };
      })
    );

    // Percentual por categoria
    const grupos = await Grupo.find({ usuario: req.user._id });
    const totalGastosGeral = gastos.reduce((acc, gasto) => acc + gasto.valor, 0);
    
    const percentualPorCategoria = await Promise.all(
      grupos.map(async (grupo) => {
        const gastosGrupo = await Gasto.find({
          usuario: req.user._id,
          "tipoDespesa.grupo": grupo._id,
          data: { $gte: startDate, $lte: endDate }
        });

        const totalGrupo = gastosGrupo.reduce((acc, gasto) => acc + gasto.valor, 0);
        const percentual = totalGastosGeral > 0 ? (totalGrupo / totalGastosGeral) * 100 : 0;

        return {
          categoria: grupo.nome,
          valor: totalGrupo,
          percentual: percentual
        };
      })
    );

    // Relatório detalhado por tipo de despesa
    const relatorioTiposDespesa = await Promise.all(
      grupos.map(async (grupo) => {
        const gastosGrupo = await Gasto.find({
          usuario: req.user._id,
          "tipoDespesa.grupo": grupo._id,
          data: { $gte: startDate, $lte: endDate }
        });

        const totalGrupo = gastosGrupo.reduce((acc, gasto) => acc + gasto.valor, 0);
        const percentual = totalGastosGeral > 0 ? (totalGrupo / totalGastosGeral) * 100 : 0;

        return {
          grupoId: grupo._id,
          grupoNome: grupo.nome,
          totalGrupo: totalGrupo,
          percentualGrupo: percentual,
          quantidade: gastosGrupo.length,
          gastos: gastosGrupo.map(g => ({
            id: g._id,
            descricao: g.descricao,
            valor: g.valor,
            data: g.data,
            subgrupo: g.tipoDespesa.subgrupo
          }))
        };
      })
    );

    const relatorioTiposDespesaFiltrado = relatorioTiposDespesa
      .filter(item => item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);

    // Gráficos
    const graficoBarrasTiposDespesa = relatorioTiposDespesaFiltrado
      .slice(0, 10)
      .map(item => ({
        nome: item.grupoNome,
        valor: item.totalGrupo,
        percentual: item.percentualGrupo
      }));

    const graficoPizzaTiposDespesa = relatorioTiposDespesaFiltrado
      .slice(0, 6)
      .map(item => ({
        categoria: item.grupoNome,
        valor: item.totalGrupo,
        percentual: item.percentualGrupo
      }));

    // Relatório por forma de pagamento
    const gastosPorFormaPagamento = {};
    gastos.forEach(gasto => {
      const forma = gasto.formaPagamento || 'Não informado';
      gastosPorFormaPagamento[forma] = (gastosPorFormaPagamento[forma] || 0) + gasto.valor;
    });

    const contasPorFormaPagamento = {};
    const contasPagas = await Conta.find({
      usuario: req.user._id,
      status: 'Pago',
      dataPagamento: { $gte: startDate, $lte: endDate }
    });
    
    contasPagas.forEach(conta => {
      const forma = conta.formaPagamento || 'Não informado';
      contasPorFormaPagamento[forma] = (contasPorFormaPagamento[forma] || 0) + conta.valor;
    });

    const relatorioFormasPagamento = [];
    const todasFormas = new Set([...Object.keys(gastosPorFormaPagamento), ...Object.keys(contasPorFormaPagamento)]);

    todasFormas.forEach(forma => {
      const totalGastos = gastosPorFormaPagamento[forma] || 0;
      const totalContas = contasPorFormaPagamento[forma] || 0;
      const totalGeral = totalGastos + totalContas;
      
      if (totalGeral > 0) {
        relatorioFormasPagamento.push({
          formaPagamento: forma,
          totalGastos: totalGastos,
          totalContas: totalContas,
          totalGeral: totalGeral
        });
      }
    });

    relatorioFormasPagamento.sort((a, b) => b.totalGeral - a.totalGeral);

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
      totalGastosMes: totalGastosMesValor,
      totalEntradasMes: totalEntradasMesValor,
      totalSaidasMes: totalSaidasMesValor,
      saldoMes: saldoMesValor,
      financeiro: {
        totalGastosMes: totalGastosMesValor,
        totalEntradasMes: totalEntradasMesValor,
        totalSaidasMes: totalSaidasMesValor,
        saldoMes: saldoMesValor
      },
      mesesComparacao,
      tipoDespesaMaisGasto,
      evolucaoSaldo,
      percentualPorCategoria,
      relatorioTiposDespesa: relatorioTiposDespesaFiltrado,
      graficoBarrasTiposDespesa,
      graficoPizzaTiposDespesa,
      relatorioCartoes: [],
      relatorioFormasPagamento
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
