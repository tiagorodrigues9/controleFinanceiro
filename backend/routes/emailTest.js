const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const auth = require('../middleware/auth');

// Testar todos os provedores de e-mail
router.get('/test', auth, async (req, res) => {
  try {
    console.log('🧪 Testando todos os provedores de e-mail...');
    
    const results = await emailService.testAllConfigurations();
    
    res.json({
      message: 'Teste de provedores concluído',
      results,
      working: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length
    });
  } catch (error) {
    console.error('Erro ao testar provedores:', error);
    res.status(500).json({ message: 'Erro ao testar provedores' });
  }
});

// Enviar e-mail de teste
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
    console.error('Erro ao enviar e-mail de teste:', error);
    res.status(500).json({ message: 'Erro ao enviar e-mail de teste' });
  }
});

module.exports = router;
