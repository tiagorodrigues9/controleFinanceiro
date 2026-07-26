const express = require('express');
const mongoose = require('mongoose');
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const Grupo = require('../models/Grupo');
const Cartao = require('../models/Cartao');
const auth = require('../middleware/auth');
const { cacheMiddleware, invalidateUserCache } = require('../utils/cache');
const { query, validationResult } = require('express-validator');
const { logger, logApiError, logPerformance } = require('../utils/logger');
const { asyncHandler, ValidationError } = require('../utils/errors');

const router = express.Router();

logger.debug('🔥 Dashboard router carregado!');

router.use(auth);

// Endpoint para limpar cache
router.get('/clear-cache', asyncHandler(async (req, res) => {
  const { invalidateUserCache } = require('../utils/cache');
  invalidateUserCache(req.user._id);
  res.json({ message: 'Cache limpo com sucesso' });
}));

// Aplicar validação e cache na rota do dashboard
router.get('/', [
  query('mes').optional().isInt({ min: 1, max: 12 }).withMessage('Mês deve estar entre 1 e 12'),
  query('ano').optional().isInt({ min: 2020, max: 2030 }).withMessage('Ano deve estar entre 2020 e 2030')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const startTime = Date.now();
  
  const { mes, ano } = req.query;
  const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
  const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

  const startDate = new Date(anoAtual, mesAtual - 1, 1);
  const endDate = new Date(anoAtual, mesAtual, 0, 23, 59, 59);
  const nextMonthStart = new Date(anoAtual, mesAtual, 1);
  const nextMonthEnd = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59);

  logger.debug('=== DASHBOARD DEBUG ===');
  logger.debug('req.user._id:', req.user._id);
  logger.debug('mesAtual:', mesAtual, 'anoAtual:', anoAtual);
  logger.debug('startDate:', startDate);
  logger.debug('endDate:', endDate);

  // Filtro base para todas as queries - CORRIGIDO COM ObjectId
  const baseFilter = {
    usuario: new mongoose.Types.ObjectId(req.user._id)
  };

    // Otimizado: Queries combinadas em agregação única para melhor performance
  const dashboardData = await Promise.all([
    // Contas - agregação única para obter todos os dados de contas
    Conta.aggregate([
      { 
        $match: { 
          usuario: new mongoose.Types.ObjectId(req.user._id),
          $or: [
            { 
              status: { $in: ['Pendente', 'Vencida'] }, 
              dataVencimento: { $gte: startDate, $lte: endDate } 
            },
            { 
              status: 'Pago',
              dataPagamento: { $gte: startDate, $lte: endDate } 
            }
          ]
        } 
      },
      {
        $group: {
          _id: { status: "$status", month: { $month: "$dataVencimento" } },
          totalValor: { $sum: "$valor" },
          count: { $sum: 1 }
        }
      }
    ]),
    
    // Gastos do mês
    Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" }, count: { $sum: 1 } } }
    ]),
    
    // Extrato do mês (entradas e saídas)
    Extrato.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          estornado: false,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$tipo",
          total: { $sum: "$valor" },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  // Processar resultados das agregações
  const [contasData, gastosData, extratoData] = dashboardData;
  
  // Calcular totais de contas a partir da agregação
  let totalContasPagar = 0;
  let totalValorContasPagarMes = 0;
  let totalContasPendentesMes = 0;
  let totalContasPagas = 0;
  let totalValorContasPagas = 0;

  contasData.forEach(item => {
    if (item._id.status === 'Pendente' || item._id.status === 'Vencida') {
      totalContasPagar += item.count;
      totalValorContasPagarMes += item.totalValor;
      totalContasPendentesMes += item.count;
    } else if (item._id.status === 'Pago') {
      totalContasPagas += item.count;
      totalValorContasPagas += item.totalValor;
    }
  });

  // Processar gastos
  const gastosMes = gastosData.length > 0 ? [{ total: gastosData[0].total }] : [];

  // Processar extrato
  const extratoMes = extratoData.map(item => ({
    _id: item._id,
    total: item.total
  }));

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

  logger.debug('gastosMes:', gastosMes);
  logger.debug('totalGastosMesValor:', totalGastosMesValor);
  logger.debug('totalEntradasMesValor:', totalEntradasMesValor);
  logger.debug('totalSaidasMesValor:', totalSaidasMesValor);

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

  // Comparação últimos 6 meses - VERSÃO CORRIGIDA
  logger.debug('🔍 Iniciando comparação de meses...');
  const mesesComparacao = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const mesRef = new Date(anoAtual, mesAtual - 1 - i, 1);
      const mesRefEnd = new Date(anoAtual, mesAtual - i, 0, 23, 59, 59);
      
      logger.debug(`📊 Processando mês: ${mesRef.toLocaleString('pt-BR', { month: 'short', year: 'numeric' })}`);
      logger.debug(`  - Período: ${mesRef.toISOString()} a ${mesRefEnd.toISOString()}`);
      logger.debug(`  - User ID: ${req.user._id}`);
      
      // Query para extratos (Entradas apenas)
      const entradasMes = await Extrato.aggregate([
        {
          $match: {
            usuario: new mongoose.Types.ObjectId(req.user._id),
            tipo: 'Entrada',
            estornado: false,
            data: { $gte: mesRef, $lte: mesRefEnd }
          }
        },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);
      
      // Query para gastos - mais flexível
      const gastosMes = await Gasto.aggregate([
        { 
          $match: { 
            usuario: new mongoose.Types.ObjectId(req.user._id),
            data: { $gte: mesRef, $lte: mesRefEnd }
          } 
        },
        { $group: { _id: null, total: { $sum: "$valor" } } }
      ]);
      
      logger.debug(`  - Entradas: ${JSON.stringify(entradasMes)}`);
      logger.debug(`  - Gastos: ${JSON.stringify(gastosMes)}`);
      
      const totalGastos = gastosMes.length > 0 ? gastosMes[0].total : 0;
      const totalEntradas = entradasMes.length > 0 ? entradasMes[0].total : 0;
      
      return {
        mes: mesRef.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
        contas: 0, // Mantido apenas para compatibilidade de chaves
        gastos: totalGastos,
        entradas: totalEntradas,
        total: totalGastos // Sem somar contas para não duplicar com Gastos
      };
    })
  );
  
  logger.debug('📊 MesesComparação (dinâmico):', JSON.stringify(mesesComparacao, null, 2));
  
  mesesComparacao.reverse();

  // Tipo de despesa com mais gasto
  const gastos = await Gasto.find({
    usuario: req.user._id,
    data: { $gte: startDate, $lte: endDate }
  }).populate('tipoDespesa.grupo').lean();

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

  // Evolução do saldo - buscar apenas contas ativas
  const contasBancarias = await ContaBancaria.find({ usuario: req.user._id, ativo: { $ne: false } }).lean();
  const monthsRange = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
    const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
    monthsRange.push(refEnd);
  }

  // Buscar todos os extratos até a última data para calcular saldos
  const lastMonthEnd = monthsRange[monthsRange.length - 1];
  const extratosEvolucao = await Extrato.find({
    usuario: req.user._id,
    estornado: false,
    data: { $lte: lastMonthEnd }
  }).lean();

  const evolucaoSaldoRaw = contasBancarias.map((conta) => {
    // Filtrar extratos apenas desta conta bancária e ordenar cronologicamente
    const extratosConta = extratosEvolucao
      .filter(ext => ext.contaBancaria.toString() === conta._id.toString())
      .sort((a, b) => new Date(a.data) - new Date(b.data));

    // Se não há extratos para esta conta, não incluir no resultado
    if (extratosConta.length === 0) {
      return null;
    }

    let saldoAcumulado = 0;
    let indexExtrato = 0;

    const saldos = monthsRange.map((monthEnd) => {
      // Adicionar ao saldo acumulado os extratos que ocorreram até este monthEnd
      while (indexExtrato < extratosConta.length && new Date(extratosConta[indexExtrato].data) <= monthEnd) {
        const ext = extratosConta[indexExtrato];
        if (ext.tipo === 'Entrada' || ext.tipo === 'Saldo Inicial') {
          saldoAcumulado += ext.valor;
        } else {
          saldoAcumulado -= ext.valor;
        }
        indexExtrato++;
      }
      return { data: monthEnd, saldo: saldoAcumulado };
    });

    return { conta: conta.nome, saldos };
  });

  // Remover contas sem movimentação
  const evolucaoSaldo = evolucaoSaldoRaw.filter(item => item !== null);

  // Percentual por categoria
  const grupos = await Grupo.find({ usuario: req.user._id }).lean();
  const totalGeral = gastos.reduce((acc, gasto) => {
    const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
    return acc + valorGasto;
  }, 0);
  
  const percentualPorCategoria = Object.entries(gastosPorGrupo).map(([nome, totalValor]) => {
    return {
      categoria: nome,
      percentual: totalGeral > 0 ? parseFloat(((totalValor / totalGeral) * 100).toFixed(2)) : 0,
      valor: totalValor
    };
  });

  // Relatório detalhado por tipo de despesa (otimizado usando a array gastos já carregada)
  const relatorioMap = {};
  
  gastos.forEach(gasto => {
    if (!gasto.tipoDespesa || !gasto.tipoDespesa.grupo) return;
    
    const grupoId = gasto.tipoDespesa.grupo._id.toString();
    const grupoNome = gasto.tipoDespesa.grupo.nome;
    const subgrupoNome = gasto.tipoDespesa.subgrupo || 'Não categorizado';
    const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;

    if (!relatorioMap[grupoId]) {
      relatorioMap[grupoId] = {
        grupoId,
        grupoNome,
        totalGrupo: 0,
        subgruposMap: {}
      };
    }

    relatorioMap[grupoId].totalGrupo += valorGasto;
    relatorioMap[grupoId].subgruposMap[subgrupoNome] = (relatorioMap[grupoId].subgruposMap[subgrupoNome] || 0) + valorGasto;
  });

  const relatorioTiposDespesa = Object.values(relatorioMap).map(grupoData => {
    return {
      grupoId: grupoData.grupoId,
      grupoNome: grupoData.grupoNome,
      totalGrupo: grupoData.totalGrupo,
      percentualGrupo: totalGeral > 0 ? (grupoData.totalGrupo / totalGeral) * 100 : 0,
      subgrupos: Object.entries(grupoData.subgruposMap).map(([subgrupoNome, valor]) => ({
        subgrupoNome,
        valor,
        percentualSubgrupo: grupoData.totalGrupo > 0 ? (valor / grupoData.totalGrupo) * 100 : 0
      })).sort((a, b) => b.valor - a.valor)
    };
  });

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
  const cartoes = await Cartao.find({ usuario: req.user._id, ativo: true }).lean();
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

      const extratoMes = await Extrato.aggregate([
        {
          $match: {
            contaBancaria: cartao.contaBancaria,
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

      const totalGastosCartaoValor = gastosCartao.reduce((acc, gasto) => {
        const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
        return acc + valorGasto;
      }, 0);
      const totalContasCartaoValor = contasPagasCartao.reduce((acc, conta) => acc + conta.valor + (conta.jurosPago || 0), 0);

      return {
        cartaoId: cartao._id,
        nome: cartao.nome,
        tipo: cartao.tipo,
        banco: cartao.banco,
        limite: cartao.limite,
        totalGastos: totalGastosCartaoValor,
        totalContas: totalContasCartaoValor,
        totalGeral: totalGastosCartaoValor, // Ignorar totalContasCartaoValor que já vira gasto
        quantidadeTransacoes: gastosCartao.length,
        limiteUtilizado: cartao.tipo === 'Crédito' && cartao.limite > 0 ? 
          (totalGastosCartaoValor / cartao.limite) * 100 : 0,
        disponivel: cartao.tipo === 'Crédito' ? cartao.limite - totalGastosCartaoValor : null,
        totalGastosMesValor,
        totalEntradasMesValor,
        totalSaidasMesValor,
        saldoMesValor,
        disponivel: cartao.tipo === 'Crédito' ? cartao.limite - totalGastosCartaoValor : null
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
    // Ignorar gastos que foram gerados automaticamente pelo pagamento de contas
    // Isso evita a duplicação no relatório de Formas de Pagamento
    if (gasto.observacao && gasto.observacao.startsWith('[Pagamento da Conta]:')) {
      return; 
    }
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

  let sumTotalGeral = 0;

  todasFormas.forEach(forma => {
    const totalGastos = gastosPorFormaPagamento[forma] || 0;
    const totalContas = contasPorFormaPagamento[forma] || 0;
    const totalGeral = totalGastos + totalContas;
    sumTotalGeral += totalGeral;
    
    if (totalGeral > 0) {
      relatorioFormasPagamento.push({
        formaPagamento: forma,
        totalGastos: totalGastos,
        totalContas: totalContas,
        totalGeral: totalGeral
      });
    }
  });

  relatorioFormasPagamento.forEach(item => {
    item.percentualGeral = sumTotalGeral > 0 ? (item.totalGeral / sumTotalGeral) * 100 : 0;
  });

  relatorioFormasPagamento.sort((a, b) => b.totalGeral - a.totalGeral);

  // Montar resposta - COMBINANDO ESTRUTURA ANTIGA E NOVA
  const responseData = {
    // Estrutura antiga (compatibilidade)
    totalContasPagar,
    totalValorContasPagarMes: totalValorContasPagarMes || 0,
    totalContasPendentesMes,
    totalContasPagas,
    totalValorContasPagas: totalValorContasPagas || 0,
    totalContasVencidas,
    totalValorContasVencidas: totalValorContasVencidas[0]?.total || 0,
    totalContasNextMonth,
    totalValorContasNextMonth: totalValorContasNextMonth[0]?.total || 0,
    totalContasMes,
    totalValorContasPendentes: totalValorContasPendentes[0]?.total || 0,
    
    // Campos diretos para o frontend
    totalGastosMes: totalGastosMesValor,
    totalEntradasMes: totalEntradasMesValor,
    totalSaidasMes: totalSaidasMesValor,
    saldoMes: saldoMesValor,
    
    // Estrutura financeiro (para compatibilidade)
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
    relatorioCartoes: relatorioCartoesFiltrado,
    relatorioFormasPagamento
  };

  logger.debug('Dashboard data gerada:', JSON.stringify(responseData, null, 2));
  logger.debug('mesesComparacao:', JSON.stringify(mesesComparacao, null, 2));

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
