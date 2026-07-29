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
    expiresIn: process.env.JWT_EXPIRE || '15m',
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

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Registro, login, refresh token e gerenciamento de perfil
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar novo usuário
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, password]
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@email.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: senha123
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados inválidos ou usuário já existe
 *       500:
 *         description: Erro interno
 */
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
        email: user.email,
        endereco: user.endereco,
        bairro: user.bairro,
        cidade: user.cidade,
        telefone: user.telefone,
        fotoPerfil: user.fotoPerfil,
        configuracoes: user.configuracoes
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login do usuário
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@email.com
 *               password:
 *                 type: string
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso (retorna token + refreshToken + user)
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro interno
 */
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
        email: user.email,
        endereco: user.endereco,
        bairro: user.bairro,
        cidade: user.cidade,
        telefone: user.telefone,
        fotoPerfil: user.fotoPerfil,
        configuracoes: user.configuracoes
      }
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obter dados do usuário autenticado
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Dados do perfil do usuário
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Usuário não encontrado
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken -resetPasswordToken -resetPasswordExpire');
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
        telefone: user.telefone,
        fotoPerfil: user.fotoPerfil,
        configuracoes: user.configuracoes
      }
    });
  } catch (error) {
    logger.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de acesso usando refresh token
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Novo token gerado
 *       401:
 *         description: Refresh token inválido ou expirado
 */
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

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar recuperação de senha
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email de recuperação enviado (resposta genérica por segurança)
 *       400:
 *         description: Email inválido
 *       500:
 *         description: Erro ao enviar email
 */
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

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@controlefinanceiro.com',
      to: user.email,
      subject: 'Recuperação de Senha - Controle Financeiro',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #1976d2; margin: 0;">Controle Financeiro</h1>
          </div>
          <h2 style="color: #333333;">Recuperação de Senha</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">Olá,</p>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">Você solicitou a recuperação de senha. Clique no botão abaixo para redefinir sua senha:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1976d2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
          </div>
          <p style="color: #777777; font-size: 14px;">Ou copie e cole o link no seu navegador:</p>
          <p style="color: #777777; font-size: 14px; word-break: break-all;"><a href="${resetUrl}" style="color: #1976d2;">${resetUrl}</a></p>
          <p style="color: #d32f2f; font-size: 14px; font-weight: bold; margin-top: 20px;">Este link expira em 10 minutos.</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #999999; font-size: 12px; text-align: center;">Se você não solicitou esta recuperação, ignore este email e sua senha permanecerá a mesma.</p>
        </div>
      `,
      text: `Recuperação de Senha\n\nVocê solicitou a recuperação de senha. Acesse o link para redefinir: ${resetUrl}\n\nEste link expira em 10 minutos.`
    };

    try {
      const result = await emailService.sendMail(mailOptions);
      if (result && !result.success) {
        logger.error('Email de recuperação falhou (retorno success=false):', result.error);
        return res.status(500).json({ message: 'Erro ao enviar email de recuperação' });
      }
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

/**
 * @swagger
 * /api/auth/validate-reset-token/{token}:
 *   get:
 *     summary: Validar token de recuperação de senha
 *     tags: [Autenticação]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token válido
 *       400:
 *         description: Token inválido ou expirado
 */
router.get('/validate-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Token inválido ou expirado' });
    }

    res.json({ valid: true });
  } catch (error) {
    logger.error('Erro ao validar token de reset:', error);
    res.status(500).json({ message: 'Erro ao validar token' });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Redefinir senha com token de recuperação
 *     tags: [Autenticação]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso
 *       400:
 *         description: Token inválido ou dados inválidos
 */
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

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Atualizar perfil do usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               endereco:
 *                 type: string
 *               bairro:
 *                 type: string
 *               cidade:
 *                 type: string
 *               telefone:
 *                 type: string
 *               fotoPerfil:
 *                 type: string
 *               configuracoes:
 *                 type: object
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 */
router.put('/profile', auth, [
  body('nome').optional().trim().notEmpty().withMessage('Nome não pode ser vazio')
    .isLength({ max: 100 }).withMessage('Nome deve ter no máximo 100 caracteres'),
  body('endereco').optional().trim()
    .isLength({ max: 200 }).withMessage('Endereço deve ter no máximo 200 caracteres'),
  body('bairro').optional().trim()
    .isLength({ max: 100 }).withMessage('Bairro deve ter no máximo 100 caracteres'),
  body('cidade').optional().trim()
    .isLength({ max: 100 }).withMessage('Cidade deve ter no máximo 100 caracteres'),
  body('telefone').optional().trim()
    .isLength({ max: 20 }).withMessage('Telefone deve ter no máximo 20 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, endereco, bairro, cidade, telefone, configuracoes, fotoPerfil } = req.body;
    const userId = req.user._id || req.user.id;

    const updateData = {};
    if (nome !== undefined) updateData.nome = nome;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (bairro !== undefined) updateData.bairro = bairro;
    if (cidade !== undefined) updateData.cidade = cidade;
    if (telefone !== undefined) updateData.telefone = telefone;
    
    // Sanitizar configurações — aceitar apenas campos conhecidos
    if (configuracoes && configuracoes.notificacoes) {
      const notif = configuracoes.notificacoes;
      updateData.configuracoes = {
        notificacoes: {
          ativo: typeof notif.ativo === 'boolean' ? notif.ativo : true,
          contasVencidas: typeof notif.contasVencidas === 'boolean' ? notif.contasVencidas : true,
          contasProximas: typeof notif.contasProximas === 'boolean' ? notif.contasProximas : true,
          limiteCartao: typeof notif.limiteCartao === 'boolean' ? notif.limiteCartao : true,
          diasAntecedencia: [1, 3, 5, 7, 10, 15, 30].includes(Number(notif.diasAntecedencia))
            ? Number(notif.diasAntecedencia)
            : 7
        }
      };
    }

    // Foto de perfil em Base64 (limite ~500KB)
    if (fotoPerfil !== undefined) {
      if (fotoPerfil === null || fotoPerfil === '') {
        updateData.fotoPerfil = null;
      } else if (typeof fotoPerfil === 'string') {
        // Verificar se é uma data URI válida de imagem
        const dataUriRegex = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/;
        if (!dataUriRegex.test(fotoPerfil)) {
          return res.status(400).json({ message: 'Formato de imagem inválido. Use JPEG, PNG, WebP ou GIF.' });
        }
        // Verificar tamanho (~500KB em base64 ≈ ~680KB string)
        if (fotoPerfil.length > 700000) {
          return res.status(400).json({ message: 'Imagem muito grande. O tamanho máximo é 500KB.' });
        }
        updateData.fotoPerfil = fotoPerfil;
      }
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Limpar o cache de autenticação para este usuário
    if (auth.clearCache) {
      auth.clearCache(userId);
    }

    res.json({
      user: {
        id: user._id,
        nome: user.nome,
        email: user.email,
        endereco: user.endereco,
        bairro: user.bairro,
        cidade: user.cidade,
        telefone: user.telefone,
        fotoPerfil: user.fotoPerfil,
        configuracoes: user.configuracoes
      }
    });
  } catch (error) {
    logger.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;

