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
  
  console.log(`📅 Período ${mes}/${ano}:`, startDate.toISOString(), 'a', endDate.toISOString());
  
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

  console.log(`💰 Gastos: R$${totalGastos.toFixed(2)}, Contas: R$${totalContas.toFixed(2)}`);
  
  return { 
    totalGastos, 
    totalContas, 
    total: totalGastos + totalContas,
    quantidadeGastos: gastosMes[0]?.quantidadeGastos || 0,
    quantidadeContas: contasMes[0]?.quantidadeContas || 0
  };
};

// Função para obter comparação de 3 meses - VERSÃO MELHORADA
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

  console.log('\n🔍 Comparação de 3 meses:');
  console.log('Mês Anterior:', meses[mesAnterior - 1], mesAnterior, '/', anoAnterior);
  console.log('Mês Atual:', meses[mesAtual - 1], mesAtual, '/', anoAtual);
  console.log('Próximo Mês:', meses[mesProximo - 1], mesProximo, '/', anoProximo);

  // Dados dinâmicos baseados no mês atual
  const dadosAtuais = await getDadosMes(usuarioId, mesAtual, anoAtual);
  const dadosAnteriores = await getDadosMes(usuarioId, mesAnterior, anoAnterior);
  const dadosProximos = await getDadosMes(usuarioId, mesProximo, anoProximo);

  // Ordem correta: ANTERIOR, ATUAL, PRÓXIMO
  const resultado = [
    {
      mes: meses[mesAnterior - 1],
      mesNumero: mesAnterior,
      ano: anoAnterior,
      totalGastos: dadosAnteriores.totalGastos,
      totalContas: dadosAnteriores.totalContas,
      total: dadosAnteriores.total,
      quantidadeGastos: dadosAnteriores.quantidadeGastos,
      quantidadeContas: dadosAnteriores.quantidadeContas,
      saldo: dadosAnteriores.totalContas - dadosAnteriores.totalGastos
    },
    {
      mes: meses[mesAtual - 1],
      mesNumero: mesAtual,
      ano: anoAtual,
      totalGastos: dadosAtuais.totalGastos,
      totalContas: dadosAtuais.totalContas,
      total: dadosAtuais.total,
      quantidadeGastos: dadosAtuais.quantidadeGastos,
      quantidadeContas: dadosAtuais.quantidadeContas,
      saldo: dadosAtuais.totalContas - dadosAtuais.totalGastos
    },
    {
      mes: meses[mesProximo - 1],
      mesNumero: mesProximo,
      ano: anoProximo,
      totalGastos: dadosProximos.totalGastos,
      totalContas: dadosProximos.totalContas,
      total: dadosProximos.total,
      quantidadeGastos: dadosProximos.quantidadeGastos,
      quantidadeContas: dadosProximos.quantidadeContas,
      saldo: dadosProximos.totalContas - dadosProximos.totalGastos
    }
  ];

  console.log('\n📊 Resultado da Comparação:');
  resultado.forEach(mes => {
    console.log(`${mes.mes}/${mes.ano}: Gastos R$${mes.totalGastos.toFixed(2)} | Contas R$${mes.totalContas.toFixed(2)} | Total R$${mes.total.toFixed(2)} | Saldo R$${mes.saldo.toFixed(2)}`);
  });

  return resultado;
};

// Handler melhorado para dashboard
module.exports = async (req, res) => {
  console.log('🚀 DASHBOARD MELHORADO HANDLER CHAMADO!!!');
  
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
    
    console.log('🚀 INICIANDO LÓGICA PRINCIPAL DO DASHBOARD MELHORADO...');
    
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

    // Dados essenciais do mês atual
    const totalContasPagar = await Conta.countDocuments({
      ...baseFilter,
      status: { $in: ['Pendente', 'Vencida'] }
    });

    const totalContasPagas = await Conta.countDocuments({
      ...baseFilter,
      status: 'Pago',
      dataPagamento: { $gte: startDate, $lte: endDate }
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

    // Relatório de comparação de meses - VERSÃO MELHORADA
    console.log('🔍 GERANDO RELATÓRIO DE COMPARAÇÃO DE MESES...');
    const comparacaoMensal = await getComparacaoMensal(req.user._id, mesAtual, anoAtual);

    // Montar resposta simplificada e focada
    const dashboardData = {
      periodo: {
        mes: mesAtual,
        ano: anoAtual,
        mesNome: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][mesAtual - 1]
      },
      
      // Dados essenciais do mês atual
      resumoMes: {
        totalContasPagar,
        totalContasPagas,
        totalGastosMes: gastosMes[0]?.total || 0,
        totalEntradasMes: totalEntradas,
        totalSaidasMes: totalSaidas,
        saldoMes: totalEntradas - totalSaidas
      },

      // Relatório de comparação de meses - FORMATO CORRETO
      comparacaoMeses: {
        dadosAtuais: {
          totalGastos: comparacaoMensal[1]?.totalGastos || 0,
          totalContas: comparacaoMensal[1]?.totalContas || 0,
          total: comparacaoMensal[1]?.total || 0,
          saldo: comparacaoMensal[1]?.saldo || 0
        },
        comparacaoMensal: comparacaoMensal
      },
      
      timestamp: new Date().toISOString()
    };

    console.log('🚀 DASHBOARD MELHORADO RESPONSE ENVIADA:', JSON.stringify(dashboardData, null, 2));
    res.json(dashboardData);
      
  } catch (error) {
    console.error('❌ ERRO NO DASHBOARD MELHORADO:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
