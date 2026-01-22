const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Models
const Conta = require('./models/Conta');
const Gasto = require('./models/Gasto');
const Grupo = require('./models/Grupo');

// Dashboard ultra simplificado - MÁXIMA ESTABILIDADE
const dashboardUltraSimples = async (req, res) => {
  try {
    console.log('🚀 Dashboard Ultra Simplificado - Iniciando...');
    
    // Verificar autenticação
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.user = decoded;
    console.log('👤 Usuário autenticado:', req.user._id);

    // Parâmetros
    const mesAtual = parseInt(req.query.mes) || 1;
    const anoAtual = parseInt(req.query.ano) || 2026;
    
    console.log(`📅 Período solicitado: ${mesAtual}/${anoAtual}`);
    
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
    
    console.log('✅ Conectado ao MongoDB');

    // Datas básicas
    const startDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-01T12:00:00.000Z`);
    const endDate = new Date(`${anoAtual}-${mesAtual.toString().padStart(2, '0')}-31T12:00:00.000Z`);
    
    console.log('📅 Período:', startDate.toISOString(), 'a', endDate.toISOString());
    
    // 1. Dados básicos - MÍNIMO
    console.log('📊 Buscando dados básicos...');
    const totalContasPagar = await Conta.countDocuments({
      usuario: decoded.id,
      status: { $in: ['Pendente', 'Vencida'] }
    });
    
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: decoded.id,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: "$valor" } } }
    ]);
    
    const totalGastosMes = gastosMes[0]?.total || 0;
    
    console.log(`💰 Total de gastos: R$${totalGastosMes.toFixed(2)}`);
    console.log(`📋 Total de contas a pagar: ${totalContasPagar}`);
    
    // 2. Relatório de formas de pagamento - BÁSICO
    console.log('💳 Buscando formas de pagamento...');
    const relatorioFormasPagamento = await Gasto.aggregate([
      {
        $match: {
          usuario: decoded.id,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$formaPagamento',
          totalGastos: { $sum: '$valor' },
          quantidade: { $sum: 1 }
        }
      },
      {
        $sort: { totalGastos: -1 }
      }
    ]);
    
    console.log(`💳 Formas de pagamento: ${relatorioFormasPagamento.length} encontradas`);
    
    // 3. Relatório de tipos de despesa - BÁSICO
    console.log('📋 Buscando tipos de despesa...');
    const relatorioTiposDespesa = await Gasto.aggregate([
      {
        $match: {
          usuario: decoded.id,
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
        $sort: { totalGrupo: -1 }
      }
    ]);
    
    console.log(`📋 Tipos de despesa: ${relatorioTiposDespesa.length} encontrados`);
    
    // 4. Top 10 categorias - BÁSICO
    const graficoBarrasTiposDespesa = relatorioTiposDespesa.slice(0, 10).map(item => ({
      nome: item._id || 'Sem Categoria',
      valor: item.totalGrupo || 0,
      quantidade: item.quantidade || 0
    }));
    
    // Montar resposta ultra-simples
    const dashboardData = {
      periodo: {
        mes: mesAtual,
        ano: anoAtual
      },
      financeiro: {
        totalGastosMes: totalGastosMes,
        totalContasPagar: totalContasPagar
      },
      relatorioFormasPagamento: relatorioFormasPagamento.map(item => ({
        formaPagamento: item._id || 'Não informado',
        totalGastos: item.totalGastos || 0,
        quantidade: item.quantidade || 0
      })),
      relatorioTiposDespesa: relatorioTiposDespesa.map(item => ({
        grupoId: item._id,
        grupoNome: item._id || 'Sem Categoria',
        totalGrupo: item.totalGrupo || 0,
        quantidade: item.quantidade || 0,
        subgrupos: []
      })),
      graficoBarrasTiposDespesa: graficoBarrasTiposDespesa,
      timestamp: new Date().toISOString()
    };
    
    console.log('🚀 Dashboard Ultra Simplificado - Enviando resposta...');
    console.log('📊 Estrutura:', JSON.stringify(dashboardData, null, 2));
    
    res.json(dashboardData);
    
  } catch (error) {
    console.error('❌ Erro no dashboard ultra simplificado:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = dashboardUltraSimples;
