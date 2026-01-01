const nodemailer = require('nodemailer');

// Serviço de e-mail simplificado e mais confiável
class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    // Tentar configurar SendGrid primeiro (mais confiável)
    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000
      });
      console.log('✅ EmailService configurado com SendGrid');
      return;
    }

    // Tentar Mailtrap (desenvolvimento)
    if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000
      });
      console.log('✅ EmailService configurado com Mailtrap (desenvolvimento)');
      return;
    }

    // Fallback para Gmail/Outlook com configuração otimizada
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
      const port = parseInt(process.env.EMAIL_PORT) || 587;
      
      // Configuração específica para Gmail no Render.com
      this.transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465, // true para 465, false para outras portas
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Configurações TLS otimizadas
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        // Timeouts aumentados para Render.com
        connectionTimeout: 30000,  // 30 segundos
        greetingTimeout: 20000,   // 20 segundos
        socketTimeout: 20000,     // 20 segundos
        // Configurações adicionais para estabilidade
        pool: true,
        maxConnections: 1,
        maxMessages: 5,
        rateDelta: 1000,
        rateLimit: 5
      });
      console.log(`✅ EmailService configurado com ${host} (porta ${port})`);
      return;
    }

    console.warn('⚠️ Nenhuma configuração de e-mail encontrada');
  }

  async sendMail(mailOptions) {
    if (!this.transporter) {
      throw new Error('Serviço de e-mail não configurado');
    }

    try {
      console.log('📧 Tentando enviar e-mail...');
      
      // Adicionar informações de fallback
      const enhancedOptions = {
        ...mailOptions,
        from: mailOptions.from || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@controlefinanceiro.com',
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High'
        }
      };

      const result = await this.transporter.sendMail(enhancedOptions);
      console.log('✅ E-mail enviado com sucesso:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        provider: this.getProviderName()
      };

    } catch (error) {
      console.error('❌ Erro detalhado ao enviar e-mail:', {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        stack: error.stack
      });

      // Tentar reconectar se for erro de conexão
      if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        console.log('🔄 Tentando reconectar...');
        try {
          this.transporter.close();
          this.setupTransporter();
          
          // Tentar novamente uma vez
          const result = await this.transporter.sendMail(mailOptions);
          console.log('✅ E-mail enviado na segunda tentativa:', result.messageId);
          
          return {
            success: true,
            messageId: result.messageId,
            provider: this.getProviderName()
          };
        } catch (retryError) {
          console.error('❌ Falha na segunda tentativa:', retryError.message);
        }
      }

      throw error;
    }
  }

  getProviderName() {
    if (process.env.SENDGRID_API_KEY) return 'SendGrid';
    if (process.env.MAILTRAP_USER) return 'Mailtrap';
    if (process.env.EMAIL_HOST?.includes('gmail')) return 'Gmail';
    if (process.env.EMAIL_HOST?.includes('outlook')) return 'Outlook';
    return 'SMTP';
  }

  // Método para testar configuração
  async testConfiguration() {
    if (!this.transporter) {
      return { success: false, error: 'Serviço não configurado' };
    }

    try {
      await this.transporter.verify();
      return { success: true, provider: this.getProviderName() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
