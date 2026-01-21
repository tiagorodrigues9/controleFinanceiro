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
  // Configurar headers CORS primeiro
  res.setHeader('Access-Control-Allow-Origin', 'https://controlefinanceiro-i7s6.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  try {
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Conectar ao MongoDB
    await connectDB();
    
    // Extrair path da URL
    const url = req.url || '';
    const path = url.split('?')[0]; // Remover query params
    
    // Roteamento baseado no path
    if (req.method === 'POST' && path === '/login') {
      // Validação
      const errors = validationResult([
        { body: 'email', value: req.body.email },
        { body: 'password', value: req.body.password }
      ]);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      const token = generateToken(user._id);

      return res.json({
        token,
        user: {
          id: user._id,
          nome: user.nome,
          email: user.email
        }
      });
    }
    
    if (req.method === 'POST' && path === '/register') {
      // Validação
      const errors = validationResult([
        { body: 'nome', value: req.body.nome },
        { body: 'email', value: req.body.email },
        { body: 'password', value: req.body.password }
      ]);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { nome, email, password } = req.body;

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
    
    // Resposta padrão para outros endpoints
    res.status(404).json({ 
      message: 'Endpoint não encontrado',
      available_endpoints: ['/login', '/register']
    });
    
  } catch (error) {
    console.error('Erro no handler de auth:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
