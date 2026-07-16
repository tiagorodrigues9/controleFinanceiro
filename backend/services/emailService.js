const EmailLog = require('../models/EmailLog');
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.providers = [];
    this.setupProviders();
  }

  setupProviders() {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.providers.push({
        name: 'Gmail SMTP',
        type: 'smtp',
        transporter: nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          connectionTimeout: 30000,
          greetingTimeout: 20000,
          socketTimeout: 20000
        })
      });
    }

    if (process.env.SENDGRID_API_KEY) {
      this.providers.push({
        name: 'SendGrid',
        type: 'smtp',
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

    console.log(`✅ Configurados ${this.providers.length} provedores de e-mail`);
    this.providers.forEach((provider, index) => {
      console.log(`${index + 1}. ${provider.name} (${provider.type})`);
    });
  }

  async sendMail(mailOptions) {
    if (process.env.EMAIL_DEV_MODE === 'true') {
      return this.fallbackToDevMode(mailOptions);
    }

    if (this.providers.length === 0) {
      console.warn('Nenhum provedor de e-mail configurado');
      return {
        success: false,
        error: 'Nenhum provedor de e-mail configurado'
      };
    }

    for (const provider of this.providers) {
      try {
        console.log(`📧 Tentando enviar via ${provider.name}...`);
        
        const result = await this.sendViaSMTP(provider, mailOptions);
        
        console.log(`✅ E-mail enviado com sucesso via ${provider.name}:`, result.messageId);
        
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
        continue;
      }
    }

    console.log('🔄 Todos os provedores falharam, salvando no banco...');
    await this.saveEmailLog(mailOptions, 'failed', 'All Providers', null, 'Todos os provedores falharam');
    
    return {
      success: false,
      error: 'Todos os provedores de e-mail falharam',
      providers: this.providers.map(p => p.name)
    };
  }

  async sendViaSMTP(provider, mailOptions) {
    await provider.transporter.verify();
    
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
    
    return {
      messageId: result.messageId,
      provider: provider.name
    };
  }

  async saveEmailLog(mailOptions, status, provider, messageId, error = null) {
    try {
      const emailLog = new EmailLog({
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
        from: mailOptions.from || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@controlefinanceiro.com',
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

  async testAllConfigurations() {
    const results = [];
    
    for (const provider of this.providers) {
      try {
        await provider.transporter.verify();
        results.push({ provider: provider.name, status: 'success' });
        console.log(`✅ ${provider.name}: SMTP conectado`);
      } catch (error) {
        results.push({ provider: provider.name, status: 'failed', error: error.message });
        console.log(`❌ ${provider.name}: ${error.message}`);
      }
    }
    
    return results;
  }
}

module.exports = new EmailService();
