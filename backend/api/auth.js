// Handler específico para autenticação
const { connectDB } = require('./lib/mongodb');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado');
  }
  
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    algorithm: 'HS256',
    issuer: 'controle-financeiro',
    audience: 'controle-financeiro-users'
  });
};

module.exports = async (req, res) => {
  // Configurar headers CORS primeiro - permitir desenvolvimento e produção
  const allowedOrigins = [
    'https://controlefinanceiro-i7s6.onrender.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]); // fallback para produção
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json');
  
  console.log('=== AUTH DEBUG ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  
  try {
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      console.log('OPTIONS request - returning 200');
      res.status(200).end();
      return;
    }
    
    // Parse do body manualmente (Vercel não faz automaticamente)
    let body = {};
    if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
      try {
        const rawBody = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => data += chunk);
          req.on('end', () => resolve(data));
          req.on('error', reject);
        });
        body = JSON.parse(rawBody);
        console.log('Body parsed:', body);
      } catch (parseError) {
        console.log('Erro ao parsear body:', parseError);
      }
    }
    
    // Conectar ao MongoDB
    await connectDB();
    
    // Extrair path da URL
    const url = req.url || '';
    const path = url.split('?')[0]; // Remover query params
    
    // Debug extensivo
    console.log('=== DEBUG AUTH ===');
    console.log('req.method:', req.method);
    console.log('req.url:', url);
    console.log('path calculado:', path);
    console.log('req.headers:', req.headers);
    console.log('body parseado:', body);
    
    // Roteamento baseado no path - mais específico
    if (req.method === 'POST') {
      console.log('Detectado POST request');
      console.log('Path:', path);
      console.log('URL completa:', url);
      
      // Tentar login/register primeiro
      if (path === '/login' || path.includes('login')) {
        console.log('Roteando para login');
        
        const { email, password } = body;
        
        console.log('Login attempt:', { email, password: '***' });
        
        if (!email || !password) {
          console.log('Email ou senha vazios');
          return res.status(400).json({ message: 'Email e senha são obrigatórios' });
        }

        const user = await User.findOne({ email });
        if (!user) {
          console.log('Usuário não encontrado:', email);
          return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        console.log('Usuário encontrado:', user._id);

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          console.log('Senha incorreta');
          return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        console.log('Senha correta, gerando token...');
        const token = generateToken(user._id);
        console.log('Token gerado:', token.substring(0, 50) + '...');

        const responseData = {
          token,
          user: {
            id: user._id,
            nome: user.nome,
            email: user.email
          }
        };
        
        console.log('Enviando resposta:', responseData);
        return res.json(responseData);
      }
      
      if (path === '/register' || path.includes('register')) {
        console.log('Roteando para register');
        
        const { nome, email, password } = body;
        
        if (!nome || !email || !password) {
          return res.status(400).json({ message: 'Nome, email e senha são obrigatórios' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
          return res.status(400).json({ message: 'Usuário já cadastrado' });
        }

        const user = await User.create({ nome, email, password });
        const token = generateToken(user._id);

        return res.status(201).json({
          token,
          user: {
            id: user._id,
            nome: user.nome,
            email: user.email
          }
        });
      }
      
      // Se não for login/register, mas for POST
      console.log('POST não reconhecido, path:', path);
      return res.status(404).json({ 
        message: 'Endpoint POST não encontrado',
        path: path,
        url: url,
        available_endpoints: ['/login', '/register']
      });
    }
    
    // Resposta padrão para outros endpoints
    console.log('Nenhuma rota correspondente encontrada');
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
      debug: {
        method: req.method,
        url: url,
        path: path,
        body: body,
        headers: req.headers,
        available_endpoints: ['/login', '/register'],
        note: 'Tente POST /api/auth ou POST /api/auth/login'
      }
    });
    
  } catch (error) {
    console.error('Erro no handler de auth:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
