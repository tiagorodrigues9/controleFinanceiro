const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Gerar token JWT
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
    algorithm: 'HS256'
  });
};

// @route   POST /api/auth/register
// @desc    Registrar novo usuário
// @access  Public
router.post('/register', [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, email, password } = req.body;

    // Verificar se usuário já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Usuário já cadastrado' });
    }

    // Criar usuário
    const user = await User.create({ nome, email, password });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

// @route   POST /api/auth/login
// @desc    Autenticar usuário
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Senha é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Verificar usuário
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar senha
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// @route   GET /api/auth/me
// @desc    Obter usuário atual
// @access  Private
router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      nome: req.user.nome,
      email: req.user.email
    }
  });
});

// @route   POST /api/auth/forgot-password
// @desc    Solicitar recuperação de senha
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Email inválido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Gerar token de reset
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutos
    await user.save();

    // Enviar email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'Recuperação de Senha',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Você solicitou a recuperação de senha. Clique no link abaixo para redefinir sua senha:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>Este link expira em 10 minutos.</p>
        <p>Se você não solicitou esta recuperação, ignore este email.</p>
      `
    };

    // Enviar email usando o serviço robusto
    try {
      const result = await emailService.sendMail(mailOptions);
      console.log('Email de recuperação enviado para:', user.email, 'via', result.provider);
      res.json({ message: 'Email de recuperação enviado' });
    } catch (emailError) {
      console.error('Erro ao enviar email de recuperação:', emailError.message);
      
      // Resposta amigável para o usuário
      if (emailError.message.includes('timeout') || emailError.message.includes('connection')) {
        return res.status(500).json({ 
          message: 'Servidor de e-mail temporariamente indisponível. Tente novamente em alguns minutos.' 
        });
      }
      
      if (emailError.message.includes('auth') || emailError.message.includes('credentials')) {
        return res.status(500).json({ 
          message: 'Erro de configuração do servidor de e-mail. Contate o suporte.' 
        });
      }
      
      res.status(500).json({ message: 'Erro ao enviar email de recuperação' });
    }
  } catch (error) {
    console.error('Erro geral no forgot-password:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação de recuperação' });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Redefinir senha
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token é obrigatório'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido ou expirado' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Atualizar perfil do usuário
// @access  Private
router.put('/profile', auth, [
  body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio'),
  body('endereco').optional().trim(),
  body('bairro').optional().trim(),
  body('cidade').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, endereco, bairro, cidade } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (bairro !== undefined) updateData.bairro = bairro;
    if (cidade !== undefined) updateData.cidade = cidade;

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

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
    console.error(error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;

