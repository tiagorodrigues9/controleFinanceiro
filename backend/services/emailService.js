const nodemailer = require('nodemailer');

// Configuração do serviço de e-mail com fallback
class EmailService {
  constructor() {
    this.transporters = [];
    this.setupTransporters();
  }

  setupTransporters() {
    // Transporter 1: Configuração principal (Gmail/Outlook)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporters.push({
        name: 'Primary',
        transporter: nodemailer.createTransport({
          host: process.env.EMAIL_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: process.env.EMAIL_PORT === '465',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        })
      });
    }

    // Transporter 2: Mailtrap (para desenvolvimento/teste)
    if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
      this.transporters.push({
        name: 'Mailtrap',
        transporter: nodemailer.createTransport({
          host: 'sandbox.smtp.mailtrap.io',
          port: 2525,
          auth: {
            user: process.env.MAILTRAP_USER,
            pass: process.env.MAILTRAP_PASS
          },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        })
      });
    }

    // Transporter 3: Ethereal (para desenvolvimento)
    this.transporters.push({
      name: 'Ethereal',
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      })
    });

    console.log(`Configurados ${this.transporters.length} transporters de e-mail`);
  }

  async sendMail(mailOptions) {
    let lastError;

    // Tentar enviar com cada transporter configurado
    for (const { name, transporter } of this.transporters) {
      try {
        console.log(`Tentando enviar e-mail com ${name}...`);
        
        // Verificar conexão
        await transporter.verify();
        
        // Enviar e-mail
        const result = await transporter.sendMail(mailOptions);
        
        console.log(`E-mail enviado com sucesso via ${name}:`, result.messageId);
        
        return {
          success: true,
          messageId: result.messageId,
          provider: name
        };

      } catch (error) {
        console.error(`Erro ao enviar com ${name}:`, error.message);
        lastError = error;
        continue; // Tentar próximo transporter
      }
    }

    // Se nenhum funcionou, retornar erro detalhado
    throw lastError || new Error('Nenhum transporter de e-mail disponível');
  }

  // Método para testar configuração
  async testConfiguration() {
    const testMail = {
      from: process.env.EMAIL_FROM || 'test@example.com',
      to: process.env.EMAIL_USER || 'test@example.com',
      subject: 'Teste de Configuração de E-mail',
      html: '<p>Este é um e-mail de teste da configuração do servidor.</p>'
    };

    try {
      const result = await this.sendMail(testMail);
      return { success: true, ...result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
