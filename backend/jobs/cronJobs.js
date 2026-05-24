const cron = require('node-cron');
const Conta = require('../models/Conta');
const { logger } = require('../utils/logger');

// Roda todo dia à meia-noite (00:00)
const initCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Iniciando cronjob de contas recorrentes...');
    try {
      const hojeMaisDezDias = new Date();
      hojeMaisDezDias.setDate(hojeMaisDezDias.getDate() + 10);

      const contasRecorrentes = await Conta.find({
        frequencia: { $in: ['Semanal', 'Mensal', 'Anual'] },
        parcelaGerada: false,
        dataVencimento: { $lte: hojeMaisDezDias },
        ativo: true
      });

      for (const conta of contasRecorrentes) {
        // Gerar próxima conta
        let novaDataVencimento = new Date(conta.dataVencimento);
        
        if (conta.frequencia === 'Semanal') {
          novaDataVencimento.setDate(novaDataVencimento.getDate() + 7);
        } else if (conta.frequencia === 'Mensal') {
          novaDataVencimento.setMonth(novaDataVencimento.getMonth() + 1);
        } else if (conta.frequencia === 'Anual') {
          novaDataVencimento.setFullYear(novaDataVencimento.getFullYear() + 1);
        }

        const novaConta = new Conta({
          nome: conta.nome,
          dataVencimento: novaDataVencimento,
          valor: conta.valor,
          fornecedor: conta.fornecedor,
          observacao: conta.observacao,
          usuario: conta.usuario,
          frequencia: conta.frequencia,
          parcelaGerada: false,
          status: 'Pendente',
          tipoControle: conta.tipoControle,
          formaPagamento: conta.formaPagamento
        });

        await novaConta.save();

        // Marcar a antiga como gerada
        conta.parcelaGerada = true;
        await conta.save();

        logger.info(`Nova parcela gerada para a conta: ${conta.nome} do usuário ${conta.usuario}`);
      }
    } catch (error) {
      logger.error('Erro no cronjob de contas recorrentes:', error);
    }
  });
};

module.exports = { initCronJobs };
