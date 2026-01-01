const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// Serviço de e-mail com Resend (mais simples e confiável)
class EmailService {
  constructor() {
    this.providers = [];
    this.setupProviders();
  }

  setupProviders() {
    // Provider 1: Resend (RECOMENDADO - mais simples)
    if (process.env.RESEND_API_KEY) {
      this.providers.push({
        name: 'Resend',
        transporter: nodemailer.createTransport({
          host: 'smtp.resend.com',
          port: 465,
          secure: true, // SSL obrigatório
          auth: {
            user: 'resend',
            pass: process.env.RESEND_API_KEY
          },
          connectionTimeout: 30000,
          greetingTimeout: 20000,
          socketTimeout: 20000
        })
      });
    }

    // Provider 2: SendGrid (backup)
    if (process.env.SENDGRID_API_KEY) {
      this.providers.push({
        name: 'SendGrid',
        transporter: nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY
          },
          connectionTimeout: 30000,
          greetingTimeout: 20000,
          socketTimeout: 20000
        })
      });
    }

    // Provider 3: Mailgun (alternativa)
    if (process.env.MAILGUN_API_KEY) {
      this.providers.push({
        name: 'Mailgun',
        transporter: nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAILGUN_USER,
            pass: process.env.MAILGUN_API_KEY
          },
          connectionTimeout: 30000,
          greetingTimeout: 20000,
          socketTimeout: 20000
        })
      });
    }

    // Provider 4: Outlook (fallback)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.providers.push({
        name: 'Outlook',
        transporter: nodemailer.createTransport({
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 30000,
          greetingTimeout: 20000,
          socketTimeout: 20000
        })
      });
    }

    console.log(`✅ Configurados ${this.providers.length} provedores de e-mail`);
    this.providers.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.name}`);
    });
  }

  async sendMail(mailOptions) {
    // Se estiver em modo desenvolvimento, simular diretamente
    if (process.env.EMAIL_DEV_MODE === 'true') {
      return this.fallbackToDevMode(mailOptions);
    }

    if (this.providers.length === 0) {
      throw new Error('Nenhum provedor de e-mail configurado');
    }

    // Tentar cada provedor em ordem
    for (const provider of this.providers) {
      try {
        console.log(`📧 Tentando enviar via ${provider.name}...`);
        
        // Verificar conexão
        await provider.transporter.verify();
        console.log(`✅ Conexão ${provider.name} verificada`);
        
        // Enviar e-mail
        const enhancedOptions = {
          ...mailOptions,
          from: mailOptions.from || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@controlefinanceiro.com',
          priority: 'high',
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High'
          }
        };

        const result = await provider.transporter.sendMail(enhancedOptions);
        console.log(`✅ E-mail enviado com sucesso via ${provider.name}:`, result.messageId);
        
        // Salvar log de sucesso
        await this.saveEmailLog(mailOptions, 'sent', provider.name, result.messageId);
        
        return {
          success: true,
          messageId: result.messageId,
          provider: provider.name
        };

      } catch (error) {
        console.error(`❌ Erro ao enviar via ${provider.name}:`, {
          message: error.message,
          code: error.code
        });
        
        // Tentar próximo provedor
        continue;
      }
    }

    // Se todos falharam, salvar no banco
    console.log('🔄 Todos os provedores falharam, salvando no banco...');
    await this.saveEmailLog(mailOptions, 'failed', 'All Providers', null, 'Todos os provedores falharam');
    
    return {
      success: false,
      error: 'Todos os provedores de e-mail falharam',
      providers: this.providers.map(p => p.name)
    };
  }

  async saveEmailLog(mailOptions, status, provider, messageId, error = null) {
    try {
      const emailLog = new EmailLog({
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
        from: mailOptions.from || process.env.EMAIL_FROM || 'noreply@controlefinanceiro.com',
        status,
        provider,
        messageId,
        error
      });
      
      await emailLog.save();
      console.log(`📝 E-mail salvo no banco - Status: ${status}, Provider: ${provider}`);
      
    } catch (saveError) {
      console.error('❌ Erro ao salvar e-mail no banco:', saveError.message);
    }
  }

  async fallbackToDevMode(mailOptions) {
    console.log('📧 Modo de desenvolvimento: Simulando envio de e-mail');
    console.log('📧 Destinatário:', mailOptions.to);
    console.log('📧 Assunto:', mailOptions.subject);
    
    await this.saveEmailLog(mailOptions, 'simulated', 'Development Mode', 'dev-' + Date.now());
    
    return {
      success: true,
      messageId: 'dev-mode-' + Date.now(),
      provider: 'Development Mode',
      warning: 'E-mail simulado (serviço SMTP indisponível)'
    };
  }

  // Método para testar todas as configurações
  async testAllConfigurations() {
    const results = [];
    
    for (const provider of this.providers) {
      try {
        await provider.transporter.verify();
        results.push({ provider: provider.name, status: 'success' });
        console.log(`✅ ${provider.name}: Conectado`);
      } catch (error) {
        results.push({ provider: provider.name, status: 'failed', error: error.message });
        console.log(`❌ ${provider.name}: ${error.message}`);
      }
    }
    
    return results;
  }
}

module.exports = new EmailService();
