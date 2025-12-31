const cron = require('node-cron');
const NotificationService = require('../services/NotificationService');

class NotificationScheduler {
  static iniciar() {
    console.log('Iniciando agendador de notificações...');

    // Executar verificação de contas vencidas todos os dias às 9:00
    cron.schedule('0 9 * * *', async () => {
      console.log('Executando verificação diária de contas vencidas...');
      await NotificationService.verificarContasVencidas();
    });

    // Executar verificação de limites de cartões todo dia às 10:00
    cron.schedule('0 10 * * *', async () => {
      console.log('Executando verificação diária de limites de cartões...');
      await NotificationService.verificarLimitesCartoes();
    });

    // Limpar notificações antigas toda semana às 2:00 (domingo)
    cron.schedule('0 2 * * 0', async () => {
      console.log('Executando limpeza semanal de notificações antigas...');
      await NotificationService.limparNotificacoesAntigas();
    });

    console.log('Agendador de notificações iniciado com sucesso!');
  }
}

module.exports = NotificationScheduler;
