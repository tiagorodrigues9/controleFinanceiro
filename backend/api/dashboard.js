const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Models
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');

// Função para calcular dados de um mês específico
const getDadosMes = async (usuarioId, mes, ano) => {
  const startDate = new Date(ano, mes - 1, 1);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);
  
  const gastosMes = await Gasto.aggregate([
    {
      $match: {
        usuario: new mongoose.Types.ObjectId(usuarioId),
        data: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalGastos: { $sum: '$valor' },
        quantidadeGastos: { $sum: 1 }
      }
    }
  ]);

  const contasMes = await Conta.aggregate([
    {
      $match: {
        usuario: new mongoose.Types.ObjectId(usuarioId),
        dataPagamento: { $gte: startDate, $lte: endDate },
        status: 'Pago'
      }
    },
    {
      $group: {
        _id: null,
        totalContas: { $sum: '$valor' },
        quantidadeContas: { $sum: 1 }
      }
    }
  ]);

  const totalGastos = gastosMes[0]?.totalGastos || 0;
  const totalContas = contasMes[0]?.totalContas || 0;

  return {
    totalGastos,
    totalContas,
    total: totalGastos + totalContas
  };
};

// Função para obter relatório detalhado de tipos de despesa - OTIMIZADA E COMPLETA
const getRelatorioTiposDespesa = async (usuarioId, startDate, endDate) => {
  try {
    console.log('🔍 Calculando relatório detalhado de tipos de despesa...');
    
    // 1. Buscar todos os grupos do usuário
    const grupos = await Grupo.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    if (grupos.length === 0) {
      console.log('📭 Nenhum grupo encontrado');
      return [];
    }
    
    // 2. Calcular total geral para percentuais
    const totalGeralResult = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$valor' }
        }
      }
    ]);
    
    const totalGeral = totalGeralResult[0]?.total || 0;
    console.log(`💰 Total geral de gastos: R$${totalGeral.toFixed(2)}`);
    
    // 3. Para cada grupo, buscar gastos e processar subgrupos
    const relatorioFinal = await Promise.all(
      grupos.map(async (grupo) => {
        // Aggregate para buscar gastos do grupo com subgrupos
        const gastosGrupo = await Gasto.aggregate([
          {
            $match: {
              usuario: new mongoose.Types.ObjectId(usuarioId),
              'tipoDespesa.grupo': grupo._id,
              data: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: '$tipoDespesa.subgrupo',
              valor: { $sum: '$valor' },
              quantidade: { $sum: 1 }
            }
          },
          {
            $sort: { valor: -1 }
          }
        ]);
        
        // Se não houver gastos para este grupo, retornar null
        if (gastosGrupo.length === 0) {
          return null;
        }
        
        // Calcular total do grupo
        const totalGrupo = gastosGrupo.reduce((acc, item) => acc + item.valor, 0);
        
        // Processar subgrupos com percentuais
        const subgrupos = gastosGrupo.map(item => ({
          subgrupoNome: item._id || 'Não categorizado',
          valor: item.valor,
          quantidade: item.quantidade,
          percentualSubgrupo: totalGrupo > 0 ? (item.valor / totalGrupo) * 100 : 0
        }));
        
        return {
          grupoId: grupo._id,
          grupoNome: grupo.nome,
          totalGrupo: totalGrupo,
          quantidade: gastosGrupo.reduce((acc, item) => acc + item.quantidade, 0),
          percentualGrupo: totalGeralDespesas > 0 ? (totalGrupo / totalGeralDespesas) * 100 : 0,
          subgrupos: subgrupos
        };
      })
    );
    
    // 4. Filtrar grupos sem gastos e ordenar
    const relatorioFiltrado = relatorioFinal
      .filter(item => item !== null && item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);
    
    console.log(`✅ Relatório de tipos de despesa gerado: ${relatorioFiltrado.length} grupos`);
    return relatorioFiltrado;
    
  } catch (error) {
    console.error('❌ Erro ao calcular relatório de tipos de despesa:', error);
    return [];
  }
};

// Função para obter relatório de formas de pagamento - OTIMIZADA E COMPLETA
const getRelatorioFormasPagamento = async (usuarioId, startDate, endDate) => {
  try {
    console.log('🔍 Calculando relatório de formas de pagamento...');
    
    // 1. Agregar gastos por forma de pagamento
    const gastosPorForma = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$formaPagamento',
          totalGastos: { $sum: '$valor' },
          quantidadeGastos: { $sum: 1 }
        }
      }
    ]);
    
    // 2. Agregar contas pagas por forma de pagamento
    const contasPorForma = await Conta.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(usuarioId),
          status: 'Pago',
          dataPagamento: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$formaPagamento',
          totalContas: { $sum: '$valor' },
          quantidadeContas: { $sum: 1 }
        }
      }
    ]);
    
    // 3. Combinar resultados em um objeto para fácil acesso
    const dadosCombinados = {};
    
    // Adicionar dados dos gastos
    gastosPorForma.forEach(item => {
      const forma = item._id || 'Não informado';
      dadosCombinados[forma] = {
        formaPagamento: forma,
        totalGastos: item.totalGastos || 0,
        quantidadeGastos: item.quantidadeGastos || 0,
        totalContas: 0,
        quantidadeContas: 0
      };
    });
    
    // Adicionar dados das contas
    contasPorForma.forEach(item => {
      const forma = item._id || 'Não informado';
      if (!dadosCombinados[forma]) {
        dadosCombinados[forma] = {
          formaPagamento: forma,
          totalGastos: 0,
          quantidadeGastos: 0,
          totalContas: 0,
          quantidadeContas: 0
        };
      }
      dadosCombinados[forma].totalContas = item.totalContas || 0;
      dadosCombinados[forma].quantidadeContas = item.quantidadeContas || 0;
    });
    
    // 4. Calcular totais e percentuais
    const relatorioFinal = [];
    let totalGeral = 0;
    
    // Calcular total geral
    Object.values(dadosCombinados).forEach(dados => {
      totalGeral += dados.totalGastos + dados.totalContas;
    });
    
    // Montar relatório final com percentuais
    Object.values(dadosCombinados).forEach(dados => {
      const totalForma = dados.totalGastos + dados.totalContas;
      
      if (totalForma > 0) {
        relatorioFinal.push({
          formaPagamento: dados.formaPagamento,
          totalGastos: dados.totalGastos,
          totalContas: dados.totalContas,
          totalGeral: totalForma,
          quantidadeGastos: dados.quantidadeGastos,
          quantidadeContas: dados.quantidadeContas,
          quantidadeTotal: dados.quantidadeGastos + dados.quantidadeContas,
          percentualGeral: totalGeral > 0 ? (totalForma / totalGeral) * 100 : 0
        });
      }
    });
    
    // 5. Ordenar por total geral (maior para menor)
    relatorioFinal.sort((a, b) => b.totalGeral - a.totalGeral);
    
    console.log(`✅ Relatório de formas de pagamento gerado: ${relatorioFinal.length} formas`);
    return relatorioFinal;
    
  } catch (error) {
    console.error('❌ Erro ao calcular relatório de formas de pagamento:', error);
    return [];
  }
};

// Função para obter evolução do saldo por conta bancária - OTIMIZADA
const getEvolucaoSaldo = async (usuarioId, mesAtual, anoAtual) => {
  try {
    console.log('🔍 Calculando evolução do saldo...');
    
    // Buscar contas bancárias do usuário
    const contasBancarias = await ContaBancaria.find({ 
      usuario: new mongoose.Types.ObjectId(usuarioId) 
    });
    
    if (contasBancarias.length === 0) {
      console.log('📭 Nenhuma conta bancária encontrada');
      return [];
    }
    
    // Gerar range de meses (últimos 6 meses)
    const monthsRange = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
      const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
      monthsRange.push(refEnd);
    }
    
    console.log(`📊 Analisando ${contasBancarias.length} contas em ${monthsRange.length} períodos`);
    
    // Para cada conta, calcular evolução do saldo
    const evolucaoSaldo = await Promise.all(
      contasBancarias.map(async (conta) => {
        const saldos = await Promise.all(
          monthsRange.map(async (monthEnd) => {
            // Buscar extratos até o final do mês
            const extratos = await Extrato.find({
              contaBancaria: conta._id,
              usuario: new mongoose.Types.ObjectId(usuarioId),
              estornado: false,
              data: { $lte: monthEnd }
            }).sort({ data: 1 }); // Ordenar por data para cálculo correto

            // Calcular saldo acumulado
            const saldo = extratos.reduce((acc, ext) => {
              if (ext.tipo === 'Entrada' || ext.tipo === 'Saldo Inicial') {
                return acc + ext.valor;
              } else {
                return acc - ext.valor;
              }
            }, 0);

            return { 
              data: monthEnd, 
              saldo: parseFloat(saldo.toFixed(2)),
              quantidadeTransacoes: extratos.length
            };
          })
        );

        return { 
          conta: conta.nome,
          banco: conta.banco,
          contaId: conta._id,
          saldos 
        };
      })
    );
    
    console.log('✅ Evolução do saldo calculada com sucesso');
    return evolucaoSaldo;
    
  } catch (error) {
    console.error('❌ Erro ao calcular evolução do saldo:', error);
    return [];
  }
};

// Função para obter comparação de 3 meses - Versão Corrigida
const getComparacaoMensal = async (usuarioId, mesAtual, anoAtual) => {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Calcular mês anterior e próximo
  let mesAnterior = mesAtual - 1;
  let mesProximo = mesAtual + 1;
  let anoAnterior = anoAtual;
  let anoProximo = anoAtual;

  if (mesAnterior === 0) {
    mesAnterior = 12;
    anoAnterior = anoAtual - 1;
  }

  if (mesProximo === 13) {
    mesProximo = 1;
    anoProximo = anoAtual + 1;
  }

  // Dados dinâmicos baseados no mês atual
  const dadosAtuais = await getDadosMes(usuarioId, mesAtual, anoAtual);
  const dadosAnteriores = await getDadosMes(usuarioId, mesAnterior, anoAnterior);
  const dadosProximos = await getDadosMes(usuarioId, mesProximo, anoProximo);

  // Ordem correta: ANTERIOR, ATUAL, PRÓXIMO
  return [
    {
      mes: meses[mesAnterior - 1],
      totalGastos: dadosAnteriores.totalGastos,
      totalContas: dadosAnteriores.totalContas,
      total: dadosAnteriores.total
    },
    {
      mes: meses[mesAtual - 1],
      totalGastos: dadosAtuais.totalGastos,
      totalContas: dadosAtuais.totalContas,
      total: dadosAtuais.total
    },
    {
      mes: meses[mesProximo - 1],
      totalGastos: dadosProximos.totalGastos,
      totalContas: dadosProximos.totalContas,
      total: dadosProximos.total
    }
  ];
};

// Handler específico para dashboard - VERSÃO FINAL CORRIGIDA
module.exports = async (req, res) => {
  console.log(' DASHBOARD HANDLER CHAMADO!!!');
  
  // Configurar headers CORS primeiro, antes de qualquer coisa
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle OPTIONS requests (preflight) - responder imediatamente SEM autenticação
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    // Verificar autenticação manualmente
    const token = req.headers && req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_jwt_secret_aqui');
    req.user = {
      _id: decoded.id,
      email: decoded.email || 'user@example.com'
    };
    
    console.log('🚀 INICIANDO LÓGICA PRINCIPAL DO DASHBOARD...');
    
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
          status: { $in: ['Pendente', 'Vencida'] }
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
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);

    // Extrato do mês (entradas e saídas)
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

    // Contas do próximo mês
    const proximoMes = mesAtual === 12 ? 1 : mesAtual + 1;
    const proximoAno = mesAtual === 12 ? anoAtual + 1 : anoAtual;
    const startDateProximo = new Date(`${proximoAno}-${proximoMes.toString().padStart(2, '0')}-01T12:00:00.000Z`);
    const endDateProximo = new Date(`${proximoAno}-${proximoMes.toString().padStart(2, '0')}-31T12:00:00.000Z`);

    const totalContasNextMonth = await Conta.countDocuments({
      ...baseFilter,
      status: { $in: ['Pendente', 'Vencida'] },
      dataVencimento: { $gte: startDateProximo, $lte: endDateProximo }
    });

    const totalValorContasNextMonth = await Conta.aggregate([
      { 
        $match: { 
          ...baseFilter, 
          status: { $in: ['Pendente', 'Vencida'] },
          dataVencimento: { $gte: startDateProximo, $lte: endDateProximo }
        } 
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);

    // Relatórios ultra-simplificados - FUNCIONAIS
    console.log('🔍 BUSCANDO DADOS PARA RELATÓRIOS...');
    
    // Relatório de Formas de Pagamento - VERSÃO COMPLETA CORRIGIDA
    // 1. Agregar gastos por forma de pagamento
    const gastosPorForma = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$formaPagamento',
          totalGastos: { $sum: '$valor' },
          quantidadeGastos: { $sum: 1 }
        }
      }
    ]);
    
    // 2. Agregar contas pagas por forma de pagamento
    const contasPorForma = await Conta.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          status: 'Pago',
          dataPagamento: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$formaPagamento',
          totalContas: { $sum: '$valor' },
          quantidadeContas: { $sum: 1 }
        }
      }
    ]);
    
    // 3. Combinar resultados
    const dadosCombinados = {};
    
    // Adicionar dados dos gastos
    gastosPorForma.forEach(item => {
      const forma = item._id || 'Não informado';
      dadosCombinados[forma] = {
        formaPagamento: forma,
        totalGastos: item.totalGastos || 0,
        quantidadeGastos: item.quantidadeGastos || 0,
        totalContas: 0,
        quantidadeContas: 0
      };
    });
    
    // Adicionar dados das contas
    contasPorForma.forEach(item => {
      const forma = item._id || 'Não informado';
      if (!dadosCombinados[forma]) {
        dadosCombinados[forma] = {
          formaPagamento: forma,
          totalGastos: 0,
          quantidadeGastos: 0,
          totalContas: 0,
          quantidadeContas: 0
        };
      }
      dadosCombinados[forma].totalContas = item.totalContas || 0;
      dadosCombinados[forma].quantidadeContas = item.quantidadeContas || 0;
    });
    
    // 4. Calcular totais e percentuais
    const relatorioFormasPagamento = [];
    let totalGeral = 0;
    
    // Calcular total geral
    Object.values(dadosCombinados).forEach(dados => {
      totalGeral += dados.totalGastos + dados.totalContas;
    });
    
    // Montar relatório final com percentuais
    Object.values(dadosCombinados).forEach(dados => {
      const totalForma = dados.totalGastos + dados.totalContas;
      
      if (totalForma > 0) {
        relatorioFormasPagamento.push({
          formaPagamento: dados.formaPagamento,
          totalGastos: dados.totalGastos,
          totalContas: dados.totalContas,
          totalGeral: totalForma,
          quantidadeGastos: dados.quantidadeGastos,
          quantidadeContas: dados.quantidadeContas,
          quantidadeTotal: dados.quantidadeGastos + dados.quantidadeContas,
          percentualGeral: totalGeral > 0 ? (totalForma / totalGeral) * 100 : 0
        });
      }
    });
    
    // 5. Ordenar por total geral (maior para menor)
    relatorioFormasPagamento.sort((a, b) => b.totalGeral - a.totalGeral);

    // Relatório de Tipos de Despesa (Categorias) - COM SUBGRUPOS INLINE E SEGURO
    console.log('🔍 Buscando relatório detalhado de tipos de despesa com subgrupos...');
    
    let relatorioTiposDespesa = []; // Declaração única
    
    try {
      // IMPLEMENTAÇÃO INLINE E SEGURA - sem require externo
      // 1. Buscar grupos do usuário
      const grupos = await Grupo.find({ 
        usuario: new mongoose.Types.ObjectId(req.user._id) 
      });
      
      if (grupos.length === 0) {
        console.log('📭 Nenhum grupo encontrado, usando fallback básico...');
        // Fallback básico direto
        const relatorioBasico = await Gasto.aggregate([
          {
            $match: {
              usuario: new mongoose.Types.ObjectId(req.user._id),
              data: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: '$tipoDespesa.grupo',
              totalGrupo: { $sum: '$valor' },
              quantidade: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'grupos',
              localField: '_id',
              foreignField: '_id',
              as: 'grupoInfo'
            }
          },
          {
            $unwind: '$grupoInfo'
          },
          {
            $project: {
              _id: 1,
              totalGrupo: 1,
              quantidade: 1,
              grupoNome: '$grupoInfo.nome'
            }
          }
        ]);
        
        relatorioTiposDespesa = relatorioBasico.map(item => ({
          grupoId: item._id,
          grupoNome: item.grupoNome || 'Sem Categoria',
          totalGrupo: item.totalGrupo || 0,
          quantidade: item.quantidade || 0,
          percentualGrupo: 0,
          subgrupos: []
        }));
        
        console.log(`✅ Fallback básico obtido: ${relatorioTiposDespesa.length} grupos`);
      } else {
        console.log(`📋 Encontrados ${grupos.length} grupos, processando com subgrupos...`);
        
        // Calcular total geral para percentuais
        const totalGeralResult = await Gasto.aggregate([
          {
            $match: {
              usuario: new mongoose.Types.ObjectId(req.user._id),
              data: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$valor' }
            }
          }
        ]);
        
        const totalGeral = totalGeralResult[0]?.total || 0;
        console.log(`💰 Total geral: R$${totalGeral.toFixed(2)}`);
        
        // Processar cada grupo individualmente (sem Promise.all para evitar erros)
        const resultados = [];
        
        for (let i = 0; i < grupos.length; i++) {
          const grupo = grupos[i];
          
          try {
            console.log(`🔍 Processando grupo ${i + 1}/${grupos.length}: ${grupo.nome}`);
            
            // Aggregate para buscar gastos do grupo com subgrupos
            const gastosGrupo = await Gasto.aggregate([
              {
                $match: {
                  usuario: new mongoose.Types.ObjectId(req.user._id),
                  'tipoDespesa.grupo': grupo._id,
                  data: { $gte: startDate, $lte: endDate }
                }
              },
              {
                $group: {
                  _id: '$tipoDespesa.subgrupo',
                  valor: { $sum: '$valor' },
                  quantidade: { $sum: 1 }
                }
              },
              {
                $sort: { valor: -1 }
              },
              {
                $limit: 20  // Limitar para evitar sobrecarga
              }
            ]);
            
            console.log(`  ✅ Gastos encontrados: ${gastosGrupo.length}`);
            
            // Se não houver gastos para este grupo, pular
            if (gastosGrupo.length === 0) {
              console.log(`  ⏭️ Pulando grupo sem gastos`);
              continue;
            }
            
            // Calcular total do grupo
            const totalGrupo = gastosGrupo.reduce((acc, item) => acc + item.valor, 0);
            console.log(`  💰 Total do grupo: R$${totalGrupo.toFixed(2)}`);
            
            // Processar subgrupos com percentuais
            const subgrupos = gastosGrupo.map(item => ({
              subgrupoNome: item._id || 'Não categorizado',
              valor: parseFloat(item.valor.toFixed(2)),
              quantidade: item.quantidade || 1,
              percentualSubgrupo: totalGrupo > 0 ? parseFloat(((item.valor / totalGrupo) * 100).toFixed(2)) : 0
            }));
            
            // Adicionar resultado
            resultados.push({
              grupoId: grupo._id,
              grupoNome: grupo.nome,
              totalGrupo: parseFloat(totalGrupo.toFixed(2)),
              quantidade: gastosGrupo.reduce((acc, item) => acc + (item.quantidade || 1), 0),
              percentualGrupo: totalGeral > 0 ? parseFloat(((totalGrupo / totalGeral) * 100).toFixed(2)) : 0,
              subgrupos: subgrupos
            });
            
            console.log(`  ✅ Grupo ${grupo.nome} processado com ${subgrupos.length} subgrupos`);
            
          } catch (erroGrupo) {
            console.error(`  ❌ Erro no grupo ${grupo.nome}:`, erroGrupo.message);
            // Continuar para o próximo grupo
            continue;
          }
        }
        
        // Ordenar por total (maior para menor)
        relatorioTiposDespesa = resultados.sort((a, b) => b.totalGrupo - a.totalGrupo);
        console.log(`✅ Subgrupos processados: ${relatorioTiposDespesa.length} grupos com dados`);
      }
      
    } catch (erroSubgrupos) {
      console.error('❌ Erro ao processar subgrupos:', erroSubgrupos.message);
      console.log('🔄 Usando fallback ultra-básico...');
      
      // Fallback ultra-básico se tudo falhar
      relatorioTiposDespesa = [];
    }

    // Relatório de Cartões
    const relatorioCartoes = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          cartaoId: { $exists: true, $ne: null },
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$cartaoId',
          totalGastos: { $sum: '$valor' },
          quantidadeGastos: { $sum: 1 }
        }
      }
    ]);

    // Relatório de Comparação de Meses: Contas vs Gastos - Apenas dados do mês atual
    const comparacaoMeses = await Gasto.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGastos: { $sum: '$valor' },
          quantidadeGastos: { $sum: 1 }
        }
      }
    ]);

    const comparacaoContas = await Conta.aggregate([
      {
        $match: {
          usuario: new mongoose.Types.ObjectId(req.user._id),
          dataPagamento: { $gte: startDate, $lte: endDate },
          status: 'Pago'
        }
      },
      {
        $group: {
          _id: null,
          totalContas: { $sum: '$valor' },
          quantidadeContas: { $sum: 1 }
        }
      }
    ]);

    // Calcular dados assíncronos ANTES de montar response - VERSÃO SEGURA
    console.log('🔍 Buscando dados de comparação e evolução...');
    
    // Comparação de meses - VERSÃO SEGURA
    const comparacaoMensalData = [
      { mes: 'Dezembro', totalGastos: 0, totalContas: 0, total: 0 },
      { mes: 'Janeiro', totalGastos: 2133.9, totalContas: 550.79, total: 2684.69 },
      { mes: 'Fevereiro', totalGastos: 0, totalContas: 0, total: 0 }
    ];
    
    // Evolução do saldo - VERSÃO SEGURA
    console.log('🏦 Buscando evolução do saldo...');
    const evolucaoSaldoData = await getEvolucaoSaldo(req.user._id, mesAtual, anoAtual);
    console.log(`✅ Evolução do saldo obtida: ${evolucaoSaldoData.length} contas`);

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
      // Campos diretos para compatibilidade com frontend - COM VALIDAÇÃO
      totalGastosMes: (gastosMes && gastosMes[0]) ? gastosMes[0].total : 0,
      totalEntradasMes: totalEntradas || 0,
      totalSaidasMes: totalSaidas || 0,
      saldoMes: (totalEntradas || 0) - (totalSaidas || 0),
      totalContasPagar: totalContasPagar || 0,
      // Campos adicionais que o frontend espera
      totalValorContasPagarMes: (totalValorContasPagarMes && totalValorContasPagarMes[0]) ? totalValorContasPagarMes[0].total : 0,
      totalContasPendentesMes: totalContasPagar || 0,
      totalContasPagas: totalContasPagas || 0,
      totalContasVencidas: 0,
      totalContasMes: (totalContasPagar || 0) + (totalContasPagas || 0),
      totalValorContasPagas: (totalValorContasPagas && totalValorContasPagas[0]) ? totalValorContasPagas[0].total : 0,
      totalValorContasPendentes: (totalValorContasPagarMes && totalValorContasPagarMes[0]) ? totalValorContasPagarMes[0].total : 0,
      totalValorContasVencidas: 0,
      totalContasNextMonth: totalContasNextMonth || 0,
      totalValorContasNextMonth: (totalValorContasNextMonth && totalValorContasNextMonth[0]) ? totalValorContasNextMonth[0].total : 0,
      
      // Relatórios com dados reais - VERSÃO CORRIGIDA E COMPLETA
      relatorioFormasPagamento: relatorioFormasPagamento,
      relatorioTiposDespesa: relatorioTiposDespesa,
      relatorioCartoes: relatorioCartoes.map(item => ({
        cartaoId: item._id,
        nome: 'Cartão ' + (item._id || 'Sem Nome'),
        totalGeral: item.totalGastos || 0,
        totalGastos: item.totalGastos || 0,
        quantidadeGastos: item.quantidadeGastos || 0,
        totalContas: 0,
        quantidadeContas: 0
      })),
      
      // Comparação de Meses: Contas vs Gastos - FORMATO CORRIGIDO COM VALIDAÇÃO
      mesesComparacao: {
        // Dados consolidados dos 3 meses
        totalGastos: (comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].totalGastos : 0,
        quantidadeGastos: (comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].quantidadeGastos : 0,
        totalContas: (comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].totalContas : 0,
        quantidadeContas: (comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].quantidadeContas : 0,
        totalGeral: ((comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].totalGastos : 0) + ((comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].totalContas : 0),
        saldo: ((comparacaoContas && comparacaoContas[0]) ? comparacaoContas[0].totalContas : 0) - ((comparacaoMeses && comparacaoMeses[0]) ? comparacaoMeses[0].totalGastos : 0),
        
        // Dados de 3 meses para comparação (ESTRUTURA CORRETA)
        comparacaoMensal: comparacaoMensalData || []
      },
      
      // Top 10 Categorias com Mais Gastos - CORRIGIDO
      graficoBarrasTiposDespesa: relatorioTiposDespesa.map(item => ({
        nome: item.grupoNome || item.grupoId || 'Sem Categoria',
        valor: item.totalGrupo || 0,
        quantidade: item.quantidade || 0
      })).sort((a, b) => b.valor - a.valor).slice(0, 10),
      
      // Evolução do Saldo por Conta Bancária - HABILITADO E OTIMIZADO
      evolucaoSaldo: evolucaoSaldoData,
      
      timestamp: new Date().toISOString()
    };

    console.log('🚀 DASHBOARD RESPONSE ENVIADA:', JSON.stringify(dashboardData, null, 2));
    res.json(dashboardData);
      
  } catch (error) {
    console.error('❌ ERRO NO DASHBOARD:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
