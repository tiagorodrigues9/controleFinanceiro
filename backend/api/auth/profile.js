const { connectDB } = require('../lib/mongodb');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Models
const User = require('../../models/User');

// Middleware de autenticação
const auth = async (req, res, next) => {
  try {
    const token = req.headers && req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
    
    if (!token) {
      return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      _id: decoded.id,
      email: decoded.email || 'user@example.com'
    };
    
    next();
  } catch (error) {
    console.error('❌ Auth Error:', error.message);
    res.status(401).json({ message: 'Token inválido.' });
  }
};

// Handler para GET /api/auth/profile e /api/auth/me
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        endereco: user.endereco,
        bairro: user.bairro,
        cidade: user.cidade
      }
    });
  } catch (error) {
    console.error('❌ Get Profile Error:', error);
    res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
};

// Handler para PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { nome, endereco, bairro, cidade } = req.body;

    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (bairro !== undefined) updateData.bairro = bairro;
    if (cidade !== undefined) updateData.cidade = cidade;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        endereco: user.endereco,
        bairro: user.bairro,
        cidade: user.cidade
      }
    });
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
};

// Handler para POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // TODO: Enviar email com o token (implementar serviço de email)
    console.log('Token de reset gerado:', resetToken);

    res.json({ message: 'Email de recuperação enviado' });
  } catch (error) {
    console.error('❌ Forgot Password Error:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
};

// Handler para POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido ou expirado' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('❌ Reset Password Error:', error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
};

// Handler principal para Vercel
module.exports = async (req, res) => {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Conectar ao MongoDB
    await connectDB();
    
    // Aplicar middleware de autenticação
    await new Promise((resolve, reject) => {
      auth(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Rotear baseado no método e URL
    const url = req.url || '';
    
    if (req.method === 'GET') {
      return getProfile(req, res);
    }
    
    if (req.method === 'PUT') {
      return updateProfile(req, res);
    }
    
    if (req.method === 'POST') {
      if (url.includes('forgot-password')) {
        return forgotPassword(req, res);
      } else if (url.includes('reset-password')) {
        return resetPassword(req, res);
      }
    }
    
    return res.status(405).json({ message: 'Método não permitido' });
    
  } catch (error) {
    console.error('Profile API Error:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
