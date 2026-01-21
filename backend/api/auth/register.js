// Handler específico para register
const { connectDB } = require('../lib/mongodb');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

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
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Conectar ao MongoDB
    await connectDB();
    
    // Parse do body manualmente
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
      } catch (parseError) {
        console.log('Erro ao parsear body:', parseError);
      }
    }
    
    console.log('=== DEBUG REGISTER ===');
    console.log('req.method:', req.method);
    console.log('req.url:', req.url);
    console.log('body parseado:', body);
    
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

    console.log('Usuário criado com sucesso:', email);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Erro no handler de register:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
