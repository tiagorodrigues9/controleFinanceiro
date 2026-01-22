const { connectDB } = require('./lib/mongodb');

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
  
  try {
    // Handle OPTIONS requests (preflight) - responder imediatamente
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
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
    
    console.log('=== DEBUG CRUD ===');
    console.log('req.method:', req.method);
    console.log('req.url:', url);
    console.log('path:', path);
    console.log('body:', body);
    
    // Roteamento baseado no path
    if (path === '/grupos' || path.includes('grupos')) {
      if (req.method === 'GET') {
        console.log('Buscando grupos...');
        const grupos = await Grupo.find().sort({ nome: 1 });
        console.log('Grupos encontrados:', grupos.length);
        return res.json(grupos);
      }
      
      if (req.method === 'POST') {
        console.log('Criando grupo:', body);
        const grupo = await Grupo.create(body);
        return res.status(201).json(grupo);
      }
    }
    
    if (path === '/contas' || path.includes('contas')) {
      if (req.method === 'GET') {
        const contas = await Conta.find().populate('fornecedor').sort({ dataVencimento: 1 });
        return res.json(contas);
      }
      
      if (req.method === 'POST') {
        const conta = await Conta.create(body);
        return res.status(201).json(conta);
      }
    }
    
    if (path === '/fornecedores' || path.includes('fornecedores')) {
      if (req.method === 'GET') {
        const fornecedores = await Fornecedor.find().sort({ nome: 1 });
        return res.json(fornecedores);
      }
      
      if (req.method === 'POST') {
        const fornecedor = await Fornecedor.create(body);
        return res.status(201).json(fornecedor);
      }
    }
    
    if (path === '/formas-pagamento' || path.includes('formas-pagamento')) {
      if (req.method === 'GET') {
        const formasPagamento = await FormaPagamento.find().sort({ nome: 1 });
        return res.json(formasPagamento);
      }
      
      if (req.method === 'POST') {
        const formaPagamento = await FormaPagamento.create(body);
        return res.status(201).json(formaPagamento);
      }
    }
    
    if (path === '/cartoes' || path.includes('cartoes')) {
      if (req.method === 'GET') {
        const cartoes = await Cartao.find().sort({ nome: 1 });
        return res.json(cartoes);
      }
      
      if (req.method === 'POST') {
        const cartao = await Cartao.create(body);
        return res.status(201).json(cartao);
      }
    }
    
    if (path === '/contas-bancarias' || path.includes('contas-bancarias')) {
      if (req.method === 'GET') {
        const contasBancarias = await ContaBancaria.find().sort({ nome: 1 });
        return res.json(contasBancarias);
      }
      
      if (req.method === 'POST') {
        const contaBancaria = await ContaBancaria.create(body);
        return res.status(201).json(contaBancaria);
      }
    }
    
    // Resposta padrão para endpoints não implementados
    console.log('Endpoint não implementado:', path);
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
      path: path,
      method: req.method,
      available_endpoints: ['/grupos', '/contas', '/fornecedores', '/formas-pagamento', '/cartoes', '/contas-bancarias']
    });
    
  } catch (error) {
    console.error('Erro no handler genérico:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
