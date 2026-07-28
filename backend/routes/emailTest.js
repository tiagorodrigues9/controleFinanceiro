const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { logger } = require('../utils/logger');
const auth = require('../middleware/auth');

// Testar todos os provedores de e-mail

/**
 * @swagger
 * tags:
 *   name: Email Teste
 *   description: Teste de configuração de email
 */
/**
 * @swagger
 * /api/email-test/test:
 *   get:
 *     summary: Verificar configuração de email
 *     tags: [Email Teste]
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno
 */
router.get('/test', auth, async (req, res) => {
  try {
    logger.debug('🧪 Testando todos os provedores de e-mail...');
    
    const results = await emailService.testAllConfigurations();
    
    res.json({
      message: 'Teste de provedores concluído',
      results,
      working: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length
    });
  } catch (error) {
    logger.error('Erro ao testar provedores:', error);
    res.status(500).json({ message: 'Erro ao testar provedores' });
  }
});

// Enviar e-mail de teste
/**
 * @swagger
 * /api/email-test/test-send:
 *   post:
 *     summary: Enviar email de teste
 *     tags: [Email Teste]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno
 */
router.post('/test-send', auth, async (req, res) => {
  try {
    const { to, subject = 'E-mail de Teste', message = 'Este é um e-mail de teste do sistema.' } = req.body;
    
    if (!to) {
      return res.status(400).json({ message: 'Destinatário é obrigatório' });
    }
    
    const mailOptions = {
      to,
      subject,
      html: `
        <h2>${subject}</h2>
        <p>${message}</p>
        <p><small>Enviado em: ${new Date().toLocaleString('pt-BR')}</small></p>
      `,
      text: `${subject}\n\n${message}\n\nEnviado em: ${new Date().toLocaleString('pt-BR')}`
    };
    
    const result = await emailService.sendMail(mailOptions);
    
    res.json({
      message: 'E-mail de teste enviado',
      result
    });
  } catch (error) {
    logger.error('Erro ao enviar e-mail de teste:', error);
    res.status(500).json({ message: 'Erro ao enviar e-mail de teste' });
  }
});

module.exports = router;
