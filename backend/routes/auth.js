const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');
const { logger } = require('../utils/logger');

const router = express.Router();

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado');
  }
  
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m', // Reduzido para 15min
    algorithm: 'HS256',
    issuer: 'controle-financeiro',
    audience: 'controle-financeiro-users'
  });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id, type: 'refresh' }, process.env.JWT_SECRET, {
    expiresIn: '30d',
    algorithm: 'HS256'
  });
};

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

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Usuário já cadastrado' });
    }

    const user = await User.create({ nome, email, password });
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      token,
      refreshToken,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

router.get('/me', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      nome: req.user.nome,
      email: req.user.email
    }
  });
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token é obrigatório' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token inválido ou revogado' });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({ token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error(error);
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseError') {
      return res.status(503).json({
        message: 'Banco de dados temporariamente indisponível. Tente novamente.',
        code: 'DB_UNAVAILABLE',
      });
    }
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Refresh token expirado ou inválido' });
    }
    return res.status(401).json({ message: 'Refresh token expirado ou inválido' });
  }
});

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
      // Retornar 200 genérico mesmo se o usuário não existir (evitar enumeração)
      return res.json({ message: 'Se o email estiver cadastrado, você receberá um link de recuperação.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'https://controlefinanceiro.onrender.com'}/reset-password/${resetToken}`;
    
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

    try {
      const result = await emailService.sendMail(mailOptions);
      logger.debug('Email de recuperação enviado para:', user.email, 'via', result.provider);
      res.json({ message: 'Se o email estiver cadastrado, você receberá um link de recuperação.' });
    } catch (emailError) {
      logger.error('Erro ao enviar email de recuperação:', emailError.message);
      
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
    logger.error('Erro geral no forgot-password:', error);
    res.status(500).json({ message: 'Erro ao processar solicitação de recuperação' });
  }
});

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
    logger.error(error);
    res.status(500).json({ message: 'Erro ao redefinir senha' });
  }
});

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

    const { nome, endereco, bairro, cidade, configuracoes } = req.body;
    const userId = req.user._id || req.user.id;

    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (bairro !== undefined) updateData.bairro = bairro;
    if (cidade !== undefined) updateData.cidade = cidade;
    
    // Adicionar configurações de notificações se fornecidas
    if (configuracoes !== undefined) {
      updateData.configuracoes = configuracoes;
    }

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
        cidade: user.cidade,
        configuracoes: user.configuracoes
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;

