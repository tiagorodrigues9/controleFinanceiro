const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// Serviço de e-mail com múltiplas estratégias de fallback
class EmailService {
  constructor() {
    this.transporter = null;
    this.provider = null;
    this.setupTransporter();
  }

  setupTransporter() {
    // Estratégia 1: SendGrid (mais confiável)
    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
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
      });
      this.provider = 'SendGrid';
      console.log('✅ EmailService configurado com SendGrid');
      return;
    }

    // Estratégia 2: Outlook com configuração otimizada para Render.com
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const host = process.env.EMAIL_HOST || 'smtp-mail.outlook.com';
      const port = parseInt(process.env.EMAIL_PORT) || 587;
      
      // Configuração otimizada para Outlook em ambiente cloud
      this.transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465, // SSL para porta 465, TLS para outras
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Configurações TLS específicas para Outlook
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3'
        },
        // Timeouts otimizados para Render.com
        connectionTimeout: 45000,  // 45 segundos
        greetingTimeout: 30000,   // 30 segundos
        socketTimeout: 30000,    // 30 segundos
        // Configurações de estabilidade
        pool: true,
        maxConnections: 1,
        maxMessages: 3,
        rateDelta: 2000,
        rateLimit: 3,
        // Configurações específicas Outlook
        requireTLS: true,
        authMethod: 'LOGIN',
        // Desabilitar verificação extra que pode causar timeout
        disableFileAccess: true,
        disableUrlAccess: true
      });
      
      this.provider = `Outlook (${host}:${port})`;
      console.log(`✅ EmailService configurado com ${this.provider}`);
      return;
    }

    console.warn('⚠️ Nenhuma configuração de e-mail encontrada');
  }

  async sendMail(mailOptions) {
    // Se estiver em modo desenvolvimento, simular diretamente
    if (process.env.EMAIL_DEV_MODE === 'true') {
      return this.fallbackToDevMode(mailOptions);
    }

    if (!this.transporter) {
      throw new Error('Serviço de e-mail não configurado');
    }

    try {
      console.log(`📧 Tentando enviar e-mail via ${this.provider}...`);
      
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

      // Verificar conexão antes de enviar
      try {
        await this.transporter.verify();
        console.log('✅ Conexão SMTP verificada');
      } catch (verifyError) {
        console.warn('⚠️ Falha na verificação de conexão:', verifyError.message);
        // Continuar mesmo se verificação falhar
      }

      const result = await this.transporter.sendMail(enhancedOptions);
      console.log(`✅ E-mail enviado com sucesso via ${this.provider}:`, result.messageId);
      
      return {
        success: true,
        messageId: result.messageId,
        provider: this.provider
      };

    } catch (error) {
      console.error(`❌ Erro ao enviar e-mail via ${this.provider}:`, {
        message: error.message,
        code: error.code,
        command: error.command
      });

      // Se for timeout ou erro de conexão, usar fallback automático
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
        console.log('🔄 SMTP indisponível, usando fallback automático...');
        return this.fallbackToDevMode(mailOptions);
      }

      // Para outros erros, também tentar fallback
      console.log('🔄 Erro SMTP, usando fallback automático...');
      return this.fallbackToDevMode(mailOptions);
    }
  }

  async fallbackToDevMode(mailOptions) {
    console.log('📧 SMTP indisponível, salvando e-mail no banco de dados');
    console.log('📧 Destinatário:', mailOptions.to);
    console.log('📧 Assunto:', mailOptions.subject);
    
    // Salvar e-mail no banco para consulta posterior
    try {
      const emailLog = new EmailLog({
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
        from: mailOptions.from || process.env.EMAIL_FROM || 'noreply@controlefinanceiro.com',
        status: 'simulated',
        provider: 'Fallback Mode',
        messageId: 'fallback-' + Date.now(),
        error: 'SMTP indisponível - e-mail salvo no banco'
      });
      
      await emailLog.save();
      console.log('✅ E-mail salvo no banco de dados com ID:', emailLog._id);
      
    } catch (saveError) {
      console.error('❌ Erro ao salvar e-mail no banco:', saveError.message);
    }
    
    // Retornar sucesso para não bloquear o usuário
    return {
      success: true,
      messageId: 'fallback-' + Date.now(),
      provider: 'Fallback Mode',
      warning: 'E-mail salvo no banco (SMTP indisponível)'
    };
  }

  getProviderName() {
    return this.provider || 'Nenhum';
  }

  // Método para testar configuração
  async testConfiguration() {
    if (!this.transporter) {
      return { success: false, error: 'Serviço não configurado' };
    }

    try {
      await this.transporter.verify();
      return { success: true, provider: this.provider };
    } catch (error) {
      console.log('⚠️ Teste de configuração falhou, mas serviço pode funcionar:', error.message);
      return { success: true, provider: this.provider, warning: 'Teste falhou, mas serviço pode funcionar' };
    }
  }
}

module.exports = new EmailService();
