const cron = require('node-cron');
const NotificationService = require('../services/NotificationService');
const NotificacaoProgramada = require('../models/NotificacaoProgramada');
const { logger } = require('../utils/logger');

class NotificationScheduler {
  static iniciar() {
    logger.info('Iniciando agendador de notificações automáticas e programadas...');

    // 1. Janela da Manhã (08:30): Radar diário de contas vencendo hoje e vencidas
    cron.schedule('30 8 * * *', async () => {
      logger.info('⏰ Executando verificação matinal de contas (08:30)...');
      try {
        await NotificationService.verificarContasVencidas();
      } catch (err) {
        logger.error('Erro na verificação matinal de contas:', err);
      }
    });

    // 2. Janela da Tarde (13:30): Lembrete de contas de hoje ainda pendentes
    cron.schedule('30 13 * * *', async () => {
      logger.info('⏰ Executando lembrete da tarde de contas pendentes (13:30)...');
      try {
        await NotificationService.verificarContasVencidas();
      } catch (err) {
        logger.error('Erro no lembrete da tarde:', err);
      }
    });

    // 3. Janela da Noite (18:00): Fechamento do expediente bancário
    cron.schedule('0 18 * * *', async () => {
      logger.info('⏰ Executando verificação pré-fechamento bancário (18:00)...');
      try {
        await NotificationService.verificarContasVencidas();
      } catch (err) {
        logger.error('Erro na verificação das 18:00:', err);
      }
    });

    // 4. Verificação diária de limites de cartões às 10:00
    cron.schedule('0 10 * * *', async () => {
      logger.info('⏰ Executando verificação de limites de cartões (10:00)...');
      try {
        await NotificationService.verificarLimitesCartoes();
      } catch (err) {
        logger.error('Erro na verificação de cartões:', err);
      }
    });

    // 5. Motor de Notificações Programadas pelo Admin (avalia a cada minuto)
    cron.schedule('* * * * *', async () => {
      try {
        await NotificationScheduler.processarNotificacoesProgramadas();
      } catch (err) {
        logger.error('Erro ao processar notificações programadas:', err);
      }
    });

    // 6. Limpeza semanal de notificações antigas todo domingo às 02:00
    cron.schedule('0 2 * * 0', async () => {
      logger.info('⏰ Executando limpeza semanal de notificações antigas...');
      try {
        await NotificationService.limparNotificacoesAntigas();
      } catch (err) {
        logger.error('Erro na limpeza de notificações antigas:', err);
      }
    });

    logger.info('Agendador de notificações configurado com sucesso!');
  }

  // Avalia se alguma notificação programada pelo admin deve ser disparada agora
  static async processarNotificacoesProgramadas() {
    const agora = new Date();
    // Obter hora, minuto e dia da semana convertidos com precisão para o fuso horário de Brasília (UTC-3)
    const dataSP = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const horas = String(dataSP.getHours()).padStart(2, '0');
    const minutos = String(dataSP.getMinutes()).padStart(2, '0');
    const horarioAtual = `${horas}:${minutos}`;
    const diaSemanaAtual = dataSP.getDay(); // 0 = Domingo, 6 = Sábado

    const programadas = await NotificacaoProgramada.find({
      ativo: true,
      horario: horarioAtual
    });

    if (programadas.length === 0) {
      return;
    }

    for (const item of programadas) {
      try {
        let deveEnviar = false;

        if (item.tipoFrequencia === 'diaria') {
          deveEnviar = true;
        } else if (item.tipoFrequencia === 'dias_semana') {
          deveEnviar = item.diasSemana && item.diasSemana.includes(diaSemanaAtual);
        } else if (item.tipoFrequencia === 'data_especifica' && item.dataEspecifica) {
          const dataItem = new Date(item.dataEspecifica);
          deveEnviar = (
            dataItem.getFullYear() === agora.getFullYear() &&
            dataItem.getMonth() === agora.getMonth() &&
            dataItem.getDate() === agora.getDate()
          );
        }

        // Prevenção contra disparo duplicado no mesmo dia/janela (últimos 60 segundos)
        if (deveEnviar && item.ultimaExecucao) {
          const diferencaMinutos = (agora.getTime() - new Date(item.ultimaExecucao).getTime()) / (1000 * 60);
          if (diferencaMinutos < 2) {
            deveEnviar = false; // Já disparou neste minuto
          }
        }

        if (deveEnviar) {
          logger.info(`📢 Disparando notificação programada automática: "${item.titulo}" (${item.horario})`);
          
          const resultado = await NotificationService.enviarBroadcast(
            item.titulo,
            item.mensagem,
            item.urlDestino || '/gastos-diarios',
            item._id
          );

          item.ultimaExecucao = agora;
          if (!item.historicoEnvios) {
            item.historicoEnvios = [];
          }
          item.historicoEnvios.push({
            data: agora,
            totalEnviados: resultado.totalEnviados,
            falhas: resultado.falhas
          });

          // Se era data específica, desativa após o envio
          if (item.tipoFrequencia === 'data_especifica') {
            item.ativo = false;
          }

          await item.save();
        }
      } catch (itemErr) {
        logger.error(`Erro ao disparar item programado ${item._id}:`, itemErr);
      }
    }
  }
}

module.exports = NotificationScheduler;
