const { connectDB } = require('./lib/mongodb');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Models
const Grupo = require('../models/Grupo');
const Conta = require('../models/Conta');
const Fornecedor = require('../models/Fornecedor');
const Gasto = require('../models/Gasto');
const ContaBancaria = require('../models/ContaBancaria');
const Extrato = require('../models/Extrato');
const FormaPagamento = require('../models/FormaPagamento');
const Cartao = require('../models/Cartao');
const Notificacao = require('../models/Notificacao');
const EmailLog = require('../models/EmailLog');

// Handler genérico para rotas CRUD
module.exports = async (req, res) => {
  // Configurar headers CORS primeiro, antes de qualquer coisa
  res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Content-Type', 'application/json');
  
  // Configurar timeout para evitar problemas no Vercel
  req.setTimeout(8000); // 8 segundos
  
  // Handle OPTIONS requests (preflight) - responder imediatamente SEM autenticação
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Aplicar middleware de autenticação apenas para outros métodos
  auth(req, res, async () => {
    try {
      // Parse do body manualmente
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT') {
        if (req.headers['content-type']?.includes('application/json')) {
          try {
            const rawBody = await new Promise((resolve, reject) => {
              let data = '';
              req.on('data', chunk => data += chunk);
              req.on('end', () => resolve(data));
              req.on('error', reject);
            });
            body = JSON.parse(rawBody);
          } catch (parseError) {
            console.log('Erro ao parsear body:', parseError);
          }
        }
      }
      
      // Conectar ao MongoDB
      await connectDB();
      
      // Extrair path da URL
      const url = req.url || '';
      const path = url.split('?')[0]; // Remover query params
      
      // Roteamento baseado no path (removendo prefixo /api)
      const cleanPath = path.replace('/api', '');
      
      console.log('=== DEBUG CRUD ===');
      console.log('req.method:', req.method);
      console.log('req.url:', url);
      console.log('path:', path);
      console.log('cleanPath:', cleanPath);
      console.log('body:', body);
      console.log('req.user._id:', req.user._id);
      
      if (cleanPath === '/grupos' || cleanPath.includes('grupos')) {
        if (req.method === 'GET') {
          console.log('Buscando grupos do usuário...');
          const grupos = await Grupo.find({ usuario: req.user._id }).sort({ nome: 1 });
          console.log('Grupos encontrados:', grupos.length);
          return res.json(grupos);
        }
        
        if (req.method === 'POST') {
          console.log('Criando grupo:', body);
          const grupo = await Grupo.create({ ...body, usuario: req.user._id });
          return res.status(201).json(grupo);
        }
      }
      
      if (cleanPath === '/contas-bancarias') {
        if (req.method === 'GET') {
          console.log('Buscando contas bancárias do usuário...');
          const contasBancarias = await ContaBancaria.find({ usuario: req.user._id })
            .sort({ nome: 1 })
            .limit(50)
            .lean();
          console.log('Contas bancárias encontradas:', contasBancarias.length);
          return res.json(contasBancarias);
        }
        
        if (req.method === 'POST') {
          const contaBancaria = await ContaBancaria.create({ ...body, usuario: req.user._id });
          return res.status(201).json(contaBancaria);
        }
      }
      
      if (cleanPath === '/contas') {
        if (req.method === 'GET') {
          console.log('Buscando contas do usuário...');
          
          // Extrair query params
          const url = req.url || '';
          const queryString = url.split('?')[1] || '';
          const params = new URLSearchParams(queryString);
          
          const mes = params.get('mes');
          const ano = params.get('ano');
          const ativo = params.get('ativo');
          const status = params.get('status');
          const dataInicio = params.get('dataInicio');
          const dataFim = params.get('dataFim');
          
          console.log('Parâmetros recebidos:', { mes, ano, ativo, status, dataInicio, dataFim });
          
          // Construir query base
          let query = { usuario: req.user._id, valor: { $ne: null } };
          
          // filtro por mês/ano (dataVencimento)
          if (mes && ano) {
            const startDate = new Date(ano, mes - 1, 1);
            const endDate = new Date(ano, mes, 0, 23, 59, 59);
            query.dataVencimento = { $gte: startDate, $lte: endDate };
            console.log('Filtro dataVencimento:', startDate, 'até', endDate);
          }
          
          // filtro por data range
          if (dataInicio && dataFim) {
            query.dataVencimento = { 
              $gte: new Date(dataInicio), 
              $lte: new Date(dataFim) 
            };
          }
          
          // filtro por ativo
          if (ativo && ativo !== 'todas') {
            query.ativo = ativo === 'ativas';
          }
          
          // filtro por status
          if (status && status !== 'todos') {
            if (status === 'pendentes') {
              query.status = { $in: ['Pendente', 'Vencida'] };
            } else if (status === 'vencidas') {
              query.status = 'Vencida';
            } else {
              query.status = status.charAt(0).toUpperCase() + status.slice(1);
            }
          }
          
          console.log('Query final:', query);
          
          // Otimizado: usar lean() para performance e limit para evitar timeout
          const contas = await Conta.find(query)
            .populate('fornecedor', 'nome')
            .sort({ dataVencimento: 1 })
            .limit(100) // Limitar para evitar timeout
            .lean(); // Mais rápido
          
          console.log('Contas encontradas:', contas.length);
          return res.json(contas);
        }
        
        if (req.method === 'POST') {
          const conta = await Conta.create({ ...body, usuario: req.user._id });
          return res.status(201).json(conta);
        }
      }
      
      if (cleanPath === '/fornecedores') {
        if (req.method === 'GET') {
          console.log('Buscando fornecedores do usuário...');
          const fornecedores = await Fornecedor.find({ usuario: req.user._id })
            .sort({ nome: 1 })
            .limit(100)
            .lean();
          return res.json(fornecedores);
        }
        
        if (req.method === 'POST') {
          const fornecedor = await Fornecedor.create({ ...body, usuario: req.user._id });
          return res.status(201).json(fornecedor);
        }
      }
    
    if (cleanPath === '/formas-pagamento') {
      if (req.method === 'GET') {
        const formasPagamento = await FormaPagamento.find({ usuario: req.user._id })
          .sort({ nome: 1 })
          .limit(50)
          .lean();
        return res.json(formasPagamento);
      }
      
      if (req.method === 'POST') {
        const formaPagamento = await FormaPagamento.create({ ...body, usuario: req.user._id });
        return res.status(201).json(formaPagamento);
      }
    }
    
    if (cleanPath === '/cartoes') {
      if (req.method === 'GET') {
        const cartoes = await Cartao.find({ usuario: req.user._id })
          .sort({ nome: 1 })
          .limit(50)
          .lean();
        return res.json(cartoes);
      }
      
      if (req.method === 'POST') {
        const cartao = await Cartao.create({ ...body, usuario: req.user._id });
        return res.status(201).json(cartao);
      }
    }
    
    if (cleanPath === '/contas-bancarias' || cleanPath.includes('contas-bancarias')) {
      if (req.method === 'GET') {
        console.log('Buscando contas bancárias do usuário...');
        const contasBancarias = await ContaBancaria.find({ usuario: req.user._id })
          .sort({ nome: 1 })
          .limit(50)
          .lean();
        return res.json(contasBancarias);
      }
      
      if (req.method === 'POST') {
        const contaBancaria = await ContaBancaria.create({ ...body, usuario: req.user._id });
        return res.status(201).json(contaBancaria);
      }
    }
    
    if (cleanPath === '/gastos' || cleanPath.includes('gastos')) {
      if (req.method === 'GET') {
        const gastos = await Gasto.find({ usuario: req.user._id }).sort({ data: -1 });
        return res.json(gastos);
      }
      
      if (req.method === 'POST') {
        const gasto = await Gasto.create({ ...body, usuario: req.user._id });
        return res.status(201).json(gasto);
      }
    }
    
    if (cleanPath === '/transferencias' || cleanPath.includes('transferencias')) {
      if (req.method === 'GET') {
        // Buscar transferências (extratos com referência tipo 'Transferencia' e tipo 'Saída')
        const transferenciasSaida = await Extrato.find({
          usuario: req.user._id,
          'referencia.tipo': 'Transferencia',
          tipo: 'Saída'
        })
        .populate('contaBancaria', 'nome banco')
        .sort({ data: -1 })
        .limit(20)
        .skip(0);

        // Para cada transferência de saída, buscar a entrada correspondente
        const transferencias = await Promise.all(
          transferenciasSaida.map(async (saida) => {
            const entrada = await Extrato.findOne({
              usuario: req.user._id,
              'referencia.tipo': 'Transferencia',
              'referencia.id': saida.referencia.id,
              tipo: 'Entrada'
            }).populate('contaBancaria', 'nome banco');

            return {
              ...saida.toObject(),
              contaDestino: entrada?.contaBancaria || null
            };
          })
        );

        return res.json({
          transferencias,
          pagination: {
            page: 1,
            limit: 20,
            total: transferencias.length,
            pages: Math.ceil(transferencias.length / 20)
          }
        });
      }
    }
    
    if (cleanPath === '/notificacoes' || cleanPath.includes('notificacoes')) {
      if (req.method === 'GET') {
        const notificacoes = await Notificacao.find({ usuario: req.user._id }).sort({ data: -1 });
        return res.json(notificacoes);
      }
      
      if (req.method === 'POST') {
        const notificacao = await Notificacao.create({ ...body, usuario: req.user._id });
        return res.status(201).json(notificacao);
      }
    }
    
    if (cleanPath === '/notificacoes/nao-lidas' || cleanPath.includes('notificacoes/nao-lidas')) {
      if (req.method === 'GET') {
        const notificacoesNaoLidas = await Notificacao.find({ usuario: req.user._id, lida: false }).sort({ data: -1 });
        return res.json(notificacoesNaoLidas);
      }
    }
    
    if (cleanPath === '/notificacoes/teste-criacao' || cleanPath.includes('notificacoes/teste-criacao')) {
      if (req.method === 'POST') {
        console.log('=== DEBUG TESTE CRIACAO ===');
        console.log('req.headers:', req.headers);
        console.log('body:', body);
        
        // Criar notificação de teste com campos obrigatórios
        const notificacaoTeste = await Notificacao.create({
          titulo: 'Notificação de Teste',
          mensagem: 'Esta é uma notificação de teste do sistema!',
          tipo: 'outro', // Usar valor válido do enum
          usuario: req.user._id, // Usar ID do usuário autenticado
          lida: false,
          data: new Date()
        });
        return res.status(201).json(notificacaoTeste);
      }
    }
    
    if (cleanPath === '/extrato' || cleanPath.includes('extrato')) {
      if (req.method === 'GET') {
        console.log('Buscando extrato do usuário...');
        
        // Extrair query params
        const url = req.url || '';
        const queryString = url.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        
        const contaBancaria = params.get('contaBancaria');
        const tipoDespesa = params.get('tipoDespesa');
        const cartao = params.get('cartao');
        const dataInicio = params.get('dataInicio');
        const dataFim = params.get('dataFim');
        
        console.log('Parâmetros extrato:', { contaBancaria, tipoDespesa, cartao, dataInicio, dataFim });
        
        // Construir query base
        let query = { usuario: req.user._id };
        
        // filtro por conta bancária
        if (contaBancaria) {
          query.contaBancaria = contaBancaria;
        }
        
        // filtro por tipo
        if (tipoDespesa) {
          query.tipo = tipoDespesa;
        }
        
        // filtro por cartão
        if (cartao) {
          query.cartao = cartao;
        }
        
        // filtro por data range
        if (dataInicio && dataFim) {
          query.data = { 
            $gte: new Date(dataInicio), 
            $lte: new Date(dataFim) 
          };
        }
        
        console.log('Query extrato:', query);
        
        const extratos = await Extrato.find(query)
          .populate('contaBancaria', 'nome banco')
          .populate('cartao', 'nome')
          .sort({ data: -1 });
        
        // Calcular totais
        let totalSaldo = 0;
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        extratos.forEach(item => {
          if (item.tipo === 'Entrada') {
            totalEntradas += item.valor || 0;
            totalSaldo += item.valor || 0;
          } else {
            totalSaidas += item.valor || 0;
            totalSaldo -= item.valor || 0;
          }
        });
        
        console.log('Extratos encontrados:', extratos.length);
        console.log('Totais:', { totalSaldo, totalEntradas, totalSaidas });
        
        return res.json({
          extratos,
          totalSaldo,
          totalEntradas,
          totalSaidas
        });
      }
      
      if (req.method === 'POST') {
        const extrato = await Extrato.create({ ...body, usuario: req.user._id });
        return res.status(201).json(extrato);
      }
    }
    
    // Resposta padrão para endpoints não implementados
    console.log('Endpoint não implementado:', cleanPath);
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
      path: cleanPath,
      method: req.method,
      available_endpoints: ['/grupos', '/contas', '/fornecedores', '/formas-pagamento', '/cartoes', '/contas-bancarias', '/gastos', '/transferencias', '/notificacoes', '/notificacoes/nao-lidas', '/notificacoes/teste-criacao', '/extrato']
    });
    
  } catch (error) {
    console.error('Erro no handler genérico:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
  });
};
