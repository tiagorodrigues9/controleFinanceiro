const express = require('express');
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const Grupo = require('../models/Grupo');
const Cartao = require('../models/Cartao');
const auth = require('../middleware/auth');
const { cacheMiddleware, invalidateUserCache } = require('../utils/cache');
const { validateDashboard } = require('../middleware/validation');
const { logger, logApiError, logPerformance } = require('../utils/logger');
const { asyncHandler, ValidationError } = require('../utils/errors');

const router = express.Router();

router.use(auth);

// Aplicar validação e cache na rota do dashboard
router.get('/', validateDashboard, asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  const { mes, ano } = req.query;
  const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
  const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

  // Validação dos parâmetros
  if (isNaN(mesAtual) || mesAtual < 1 || mesAtual > 12) {
    throw new ValidationError('Mês inválido. Deve estar entre 1 e 12.');
  }

  if (isNaN(anoAtual) || anoAtual < 2020 || anoAtual > 2030) {
    throw new ValidationError('Ano inválido. Deve estar entre 2020 e 2030.');
  }

    const startDate = new Date(anoAtual, mesAtual - 1, 1);
  const endDate = new Date(anoAtual, mesAtual, 0, 23, 59, 59);
  const nextMonthStart = new Date(anoAtual, mesAtual, 1);
  const nextMonthEnd = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59);

  console.log('=== DASHBOARD DEBUG ===');
  console.log('req.user._id:', req.user._id);
  console.log('mesAtual:', mesAtual, 'anoAtual:', anoAtual);
  console.log('startDate:', startDate);
  console.log('endDate:', endDate);

  // Filtro base para todas as queries - REMOVIDO FILTRO ATIVO PARA PEGAR TODOS OS DADOS
  const baseFilter = {
    usuario: req.user._id
  };

    // Contas a pagar
  const totalContasPagar = await Conta.countDocuments({
    ...baseFilter,
    status: { $in: ['Pendente', 'Vencida'] }
  });
  console.log('totalContasPagar:', totalContasPagar);

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
  console.log('totalValorContasPagarMes:', totalValorContasPagarMes);

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
  console.log('gastosMes:', gastosMes);

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
  console.log('extratoMes:', extratoMes);

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

  // Total de contas no mês
  const totalContasMes = await Conta.countDocuments({
    ...baseFilter,
    dataVencimento: { $gte: startDate, $lte: endDate }
  });

  // Valor total de contas pendentes
  const totalValorContasPendentes = await Conta.aggregate([
    {
      $match: {
        ...baseFilter,
        status: { $in: ['Pendente', 'Vencida'] },
        dataVencimento: { $gte: startDate, $lte: endDate }
      }
    },
    { $group: { _id: null, total: { $sum: "$valor" } } }
  ]);

  // Comparação últimos 6 meses
  const mesesComparacao = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const mesRef = new Date(anoAtual, mesAtual - 1 - i, 1);
      const mesRefEnd = new Date(anoAtual, mesAtual - i, 0, 23, 59, 59);
      
      const [contasMes, gastosMes] = await Promise.all([
        Conta.aggregate([
          { $match: { ...baseFilter, status: 'Pago', dataPagamento: { $gte: mesRef, $lte: mesRefEnd } } },
          { $group: { _id: null, total: { $sum: "$valor" } } }
        ]),
        Gasto.aggregate([
          { $match: { usuario: req.user._id, data: { $gte: mesRef, $lte: mesRefEnd } } },
          { $group: { _id: null, total: { $sum: { $toDouble: "$valor" } } } }
        ])
      ]);
      
      const totalContas = contasMes[0]?.total || 0;
      const totalGastos = gastosMes[0]?.total || 0;
      
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

  const gastosPorGrupo = {};
  gastos.forEach(gasto => {
    const grupoNome = gasto.tipoDespesa?.grupo?.nome || 'Sem grupo';
    const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
    gastosPorGrupo[grupoNome] = (gastosPorGrupo[grupoNome] || 0) + valorGasto;
  });

  const tipoDespesaMaisGasto = Object.entries(gastosPorGrupo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nome, valor]) => ({ nome, valor }));

  // Evolução do saldo
  const contasBancarias = await ContaBancaria.find({ usuario: req.user._id });
  const monthsRange = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
    const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
    monthsRange.push(refEnd);
  }

  const evolucaoSaldo = await Promise.all(
    contasBancarias.map(async (conta) => {
      const saldos = await Promise.all(
        monthsRange.map(async (monthEnd) => {
          const extratos = await Extrato.find({
            contaBancaria: conta._id,
            usuario: req.user._id,
            estornado: false,
            data: { $lte: monthEnd }
          });

          const saldo = extratos.reduce((acc, ext) => {
            if (ext.tipo === 'Entrada' || ext.tipo === 'Saldo Inicial') return acc + ext.valor;
            return acc - ext.valor;
          }, 0);

          return { data: monthEnd, saldo };
        })
      );

      return { conta: conta.nome, saldos };
    })
  );

  // Percentual por categoria
  const grupos = await Grupo.find({ usuario: req.user._id });
  const totalGeral = gastos.reduce((acc, gasto) => {
    const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
    return acc + valorGasto;
  }, 0);
  
  const percentualPorCategoria = await Promise.all(
    grupos.map(async (grupo) => {
      const gastosGrupo = await Gasto.find({
        usuario: req.user._id,
        'tipoDespesa.grupo': grupo._id,
        data: { $gte: startDate, $lte: endDate }
      });

      const totalGrupo = gastosGrupo.reduce((acc, gasto) => {
        const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
        return acc + valorGasto;
      }, 0);
      const percentual = totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0;

      return {
        categoria: grupo.nome,
        percentual: parseFloat(percentual.toFixed(2)),
        valor: totalGrupo
      };
    })
  );

  // Relatório detalhado por tipo de despesa
  const relatorioTiposDespesa = await Promise.all(
    grupos.map(async (grupo) => {
      const gastosGrupo = await Gasto.find({
        usuario: req.user._id,
        'tipoDespesa.grupo': grupo._id,
        data: { $gte: startDate, $lte: endDate }
      }).populate('tipoDespesa.grupo');

      const gastosPorSubgrupo = {};
      gastosGrupo.forEach(gasto => {
        const subgrupoNome = gasto.tipoDespesa.subgrupo || 'Não categorizado';
        const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
        gastosPorSubgrupo[subgrupoNome] = (gastosPorSubgrupo[subgrupoNome] || 0) + valorGasto;
      });

      const totalGrupo = Object.values(gastosPorSubgrupo).reduce((acc, valor) => acc + valor, 0);

      return {
        grupoId: grupo._id,
        grupoNome: grupo.nome,
        totalGrupo: totalGrupo,
        percentualGrupo: totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0,
        subgrupos: Object.entries(gastosPorSubgrupo).map(([subgrupoNome, valor]) => ({
          subgrupoNome,
          valor,
          percentualSubgrupo: totalGrupo > 0 ? (valor / totalGrupo) * 100 : 0
        })).sort((a, b) => b.valor - a.valor)
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

  // Relatório de cartões - REMOVIDO FILTRO ATIVO
  const cartoes = await Cartao.find({ usuario: req.user._id });
  const relatorioCartoes = await Promise.all(
    cartoes.map(async (cartao) => {
      const gastosCartao = await Gasto.find({
        usuario: req.user._id,
        cartao: cartao._id,
        data: { $gte: startDate, $lte: endDate }
      });

      const contasPagasCartao = await Conta.find({
        usuario: req.user._id,
        cartao: cartao._id,
        status: 'Pago',
        dataPagamento: { $gte: startDate, $lte: endDate }
      });

      const totalGastos = gastosCartao.reduce((acc, gasto) => {
        const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
        return acc + valorGasto;
      }, 0);
      const totalContas = contasPagasCartao.reduce((acc, conta) => acc + conta.valor + (conta.jurosPago || 0), 0);
      const totalGeral = totalGastos + totalContas;

      return {
        cartaoId: cartao._id,
        nome: cartao.nome,
        tipo: cartao.tipo,
        banco: cartao.banco,
        limite: cartao.limite,
        totalGastos,
        totalContas,
        totalGeral,
        quantidadeTransacoes: gastosCartao.length + contasPagasCartao.length,
        limiteUtilizado: cartao.tipo === 'Crédito' && cartao.limite > 0 ? 
          ((totalGeral / cartao.limite) * 100).toFixed(2) : 0,
        disponivel: cartao.tipo === 'Crédito' ? cartao.limite - totalGeral : null
      };
    })
  );

  const relatorioCartoesFiltrado = relatorioCartoes
    .filter(item => item.totalGeral > 0)
    .sort((a, b) => b.totalGeral - a.totalGeral);

  // Relatório de formas de pagamento
  const gastosPorFormaPagamento = {};
  const contasPorFormaPagamento = {};

  gastos.forEach(gasto => {
    const formaPagamento = gasto.formaPagamento || 'Não informado';
    const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
    gastosPorFormaPagamento[formaPagamento] = (gastosPorFormaPagamento[formaPagamento] || 0) + valorGasto;
  });

  const contasPagasFormas = await Conta.find({
    usuario: req.user._id,
    status: 'Pago',
    dataPagamento: { $gte: startDate, $lte: endDate }
  });

  contasPagasFormas.forEach(conta => {
    const formaPagamento = conta.formaPagamento || 'Não informado';
    const valorConta = Math.round(parseFloat(conta.valor) * 100) / 100 + (conta.jurosPago || 0);
    contasPorFormaPagamento[formaPagamento] = (contasPorFormaPagamento[formaPagamento] || 0) + valorConta;
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
        totalGeral: totalGeral,
        percentualGeral: totalGeral > 0 ? (totalGeral / (totalGastos + Object.values(contasPorFormaPagamento).reduce((a, b) => a + b, 0) + Object.values(gastosPorFormaPagamento).reduce((a, b) => a + b, 0))) * 100 : 0
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
    totalContasMes,
    totalValorContasPendentes: totalValorContasPendentes[0]?.total || 0,
    mesesComparacao,
    tipoDespesaMaisGasto,
    evolucaoSaldo,
    percentualPorCategoria,
    relatorioTiposDespesa: relatorioTiposDespesaFiltrado,
    graficoBarrasTiposDespesa,
    graficoPizzaTiposDespesa,
    relatorioCartoes: relatorioCartoesFiltrado,
    relatorioFormasPagamento
  };

  console.log('Dashboard data gerada:', JSON.stringify(responseData, null, 2));

  // Log de performance
  const duration = Date.now() - startTime;
  logPerformance('dashboard_load', duration, { 
    userId: req.user._id, 
    mes: mesAtual, 
    ano: anoAtual 
  });

  res.json(responseData);
}));

module.exports = router;
