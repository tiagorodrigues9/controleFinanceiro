const mongoose = require('mongoose');
const Notificacao = require('../models/Notificacao');
const Conta = require('../models/Conta');
const Cartao = require('../models/Cartao');
const Gasto = require('../models/Gasto');
const User = require('../models/User');
const webpush = require('web-push');

// Configurar chaves VAPID
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ ATENÇÃO: Chaves VAPID não configuradas no arquivo .env. As notificações Web Push não funcionarão.');
}

class NotificationService {
  // Verificar contas vencidas e próximas ao vencimento
  static async verificarContasVencidas() {
    try {
      console.log('Iniciando verificação de contas vencidas...');
      
      const hoje = new Date();
      const daqui7dias = new Date();
      daqui7dias.setDate(hoje.getDate() + 7);

      console.log(`Data atual: ${hoje.toISOString()}`);
      console.log(`Data limite (7 dias): ${daqui7dias.toISOString()}`);

      // 1. Atualizar status de todas as contas que venceram para 'Vencida'
      const dataParaVencimento = new Date(hoje);
      dataParaVencimento.setHours(0, 0, 0, 0);

      const updateResult = await Conta.updateMany(
        {
          status: 'Pendente',
          dataVencimento: { $lt: dataParaVencimento },
          ativo: { $ne: false }
        },
        { status: 'Vencida' }
      );
      
      console.log(`Atualização global: ${updateResult.modifiedCount} contas pendentes marcadas como Vencida.`);

      // Buscar todos os usuários e verificar configurações individualmente
      const usuarios = await User.find({});
      console.log(`Total de usuários encontrados: ${usuarios.length}`);

      for (const usuario of usuarios) {
        console.log(`\n=== Verificando usuário: ${usuario.nome} (${usuario._id}) ===`);
        
        // Verificar configurações de forma mais flexível
        const config = usuario.configuracoes?.notificacoes;
        const ativo = config?.ativo ?? true; // Default true se não existir
        
        console.log(`Configurações brutas:`, usuario.configuracoes);
        console.log(`Configurações de notificações:`, config);
        console.log(`Notificações ativas: ${ativo}`);
        
        if (ativo) {
          console.log(`✅ Usuário tem notificações ativas, verificando contas...`);
          await this.verificarContasUsuario(usuario._id, hoje, daqui7dias);
        } else {
          console.log(`❌ Usuário tem notificações desativadas`);
        }
      }

      console.log('\nVerificação de contas vencidas concluída');
    } catch (error) {
      console.error('Erro na verificação de contas vencidas:', error);
    }
  }

  static async verificarContasUsuario(usuarioId, hoje, daqui7dias) {
    try {
      console.log(`\n🔍 Verificando contas do usuário ${usuarioId}...`);
      
      // Primeiro, verificar configurações do usuário
      const usuario = await User.findById(usuarioId);
      const config = usuario?.configuracoes?.notificacoes;
      
      console.log(`📋 Configurações do usuário:`);
      console.log(`   - Ativo: ${config?.ativo}`);
      console.log(`   - Contas Vencidas: ${config?.contasVencidas}`);
      console.log(`   - Contas Próximas: ${config?.contasProximas}`);
      console.log(`   - Limite Cartão: ${config?.limiteCartao}`);
      
      if (!config?.ativo) {
        console.log(`❌ Usuário ${usuarioId} tem notificações desativadas`);
        return;
      }
      
      // Buscar e gerar notificações para contas vencidas
      if (config?.contasVencidas !== false) {
        const contasVencidas = await Conta.find({
          usuario: usuarioId,
          dataVencimento: { $lt: hoje },
          status: { $in: ['Pendente', 'Vencida'] },
          ativo: { $ne: false }
        }).populate('fornecedor');

        console.log(`📅 Contas vencidas encontradas: ${contasVencidas.length}`);
        
        for (const conta of contasVencidas) {
          await this.criarNotificacao(
            usuarioId,
            'conta_vencida',
            'Conta Vencida',
            `Sua conta "${conta.nome}" do fornecedor ${conta.fornecedor?.nome} está vencida. Valor: R$ ${conta.valor.toFixed(2).replace('.', ',')}`,
            'Conta',
            conta._id.toString()
          );
        }
      } else {
        console.log(`❌ Usuário ${usuarioId} tem notificações de contas vencidas desativadas`);
      }

      // Buscar e gerar notificações para contas próximas
      if (config?.contasProximas !== false) {
        const contasProximas = await Conta.find({
          usuario: usuarioId,
          dataVencimento: { 
            $gte: hoje, 
            $lte: daqui7dias 
          },
          status: 'Pendente',
          ativo: { $ne: false }
        }).populate('fornecedor');

        console.log(`⏰ Contas próximas ao vencimento: ${contasProximas.length}`);

        for (const conta of contasProximas) {
          const diasVencimento = Math.ceil((conta.dataVencimento - hoje) / (1000 * 60 * 60 * 24));
          
          await this.criarNotificacao(
            usuarioId,
            'conta_proxima_vencimento',
            'Conta Próxima ao Vencimento',
            `Sua conta "${conta.nome}" do fornecedor ${conta.fornecedor?.nome} vencerá em ${diasVencimento} dias. Valor: R$ ${conta.valor.toFixed(2).replace('.', ',')}`,
            'Conta',
            conta._id.toString()
          );
        }
      } else {
        console.log(`❌ Usuário ${usuarioId} tem notificações de contas próximas desativadas`);
      }
    } catch (error) {
      console.error(`❌ Erro ao verificar contas do usuário ${usuarioId}:`, error);
    }
  }

  // Verificar limites de cartões
  static async verificarLimitesCartoes() {
    try {
      console.log('Iniciando verificação de limites de cartões...');
      
      const hoje = new Date();
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      const usuarios = await User.find({ 
        'configuracoes.notificacoes.ativo': true,
        'configuracoes.notificacoes.limiteCartao': { $ne: false }
      });

      for (const usuario of usuarios) {
        await this.verificarCartoesUsuario(usuario._id, primeiroDiaMes, ultimoDiaMes);
      }

      console.log('Verificação de limites de cartões concluída');
    } catch (error) {
      console.error('Erro na verificação de limites de cartões:', error);
    }
  }

  static async verificarCartoesUsuario(usuarioId, primeiroDiaMes, ultimoDiaMes) {
    try {
      const cartoes = await Cartao.find({
        usuario: usuarioId,
        tipo: 'Crédito',
        ativo: true,
        limite: { $exists: true, $gt: 0 }
      });

      for (const cartao of cartoes) {
        // Calcular gastos do mês
        const gastos = await Gasto.find({
          usuario: usuarioId,
          cartao: cartao._id,
          data: { $gte: primeiroDiaMes, $lte: ultimoDiaMes }
        });

        const totalGastos = gastos.reduce((acc, gasto) => acc + gasto.valor, 0);
        const percentualUtilizado = (totalGastos / cartao.limite) * 100;

        // Notificar se usar mais de 80% do limite
        if (percentualUtilizado >= 80) {
          await this.criarNotificacao(
            usuarioId,
            'limite_cartao',
            'Limite do Cartão Próximo',
            `Seu cartão "${cartao.nome}" utilizou ${percentualUtilizado.toFixed(1)}% do limite. Disponível: R$ ${(cartao.limite - totalGastos).toFixed(2).replace('.', ',')}`,
            'Cartao',
            cartao._id
          );
        }
      }
    } catch (error) {
      console.error(`Erro ao verificar cartões do usuário ${usuarioId}:`, error);
    }
  }

  // Criar notificação
  static async criarNotificacao(usuarioId, tipo, titulo, mensagem, referenciaTipo = null, referenciaId = null) {
    try {
      console.log(`Tentando criar notificação: ${titulo} para usuário ${usuarioId}`);
      
      // Verificar se já existe notificação similar não lida (evitar duplicatas)
      const query = {
        usuario: usuarioId,
        tipo,
        lida: false
      };
      
      // Adicionar filtro de referência apenas se existir
      if (referenciaTipo && referenciaId) {
        query['referencia.tipo'] = referenciaTipo;
        query['referencia.id'] = referenciaId;
      }
      
      const notificacaoExistente = await Notificacao.findOne({
        ...query,
        createdAt: { 
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      });

      if (notificacaoExistente) {
        console.log('Notificação similar já existe, ignorando...');
        return;
      }

      // Criar objeto de notificação
      const notificacaoData = {
        usuario: usuarioId,
        tipo,
        titulo,
        mensagem
      };
      
      // Adicionar referência apenas se existir
      if (referenciaTipo && referenciaId) {
        notificacaoData.referencia = {
          tipo: referenciaTipo,
          id: referenciaId
        };
      }

      const notificacao = await Notificacao.create(notificacaoData);

      console.log(`✅ Notificação criada com sucesso: ${titulo} para usuário ${usuarioId}`);
      
      // Enviar notificação push
      await this.enviarNotificacaoPush(usuarioId, titulo, mensagem, '/notificacoes');
      
      return notificacao;
    } catch (error) {
      console.error('❌ Erro ao criar notificação:', error);
    }
  }

  // Enviar notificação push
  static async enviarNotificacaoPush(usuarioId, titulo, mensagem, url = '/notificacoes') {
    try {
      if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        console.warn('⚠️ Chaves VAPID não configuradas. Pulando envio do Web Push.');
        return false;
      }

      console.log(`📱 Enviando notificação push para usuário ${usuarioId}:`);
      console.log(`   - Título: ${titulo}`);
      
      const user = await User.findById(usuarioId);
      if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
        console.log(`   - Usuário não tem dispositivos registrados para Push.`);
        return false;
      }

      const payload = JSON.stringify({
        titulo,
        mensagem,
        url,
        timestamp: new Date().toISOString()
      });

      // Array para guardar assinaturas inválidas que precisam ser removidas
      const subscriptionsParaRemover = [];

      // Enviar para todos os dispositivos do usuário
      const sendPromises = user.pushSubscriptions.map(async (subscription, index) => {
        try {
          await webpush.sendNotification(subscription, payload);
          console.log(`   ✅ Enviado para dispositivo ${index + 1}`);
        } catch (err) {
          console.error(`   ❌ Falha no dispositivo ${index + 1}:`, err.statusCode);
          // Se a assinatura for inválida/expirada (410 ou 404), deve ser removida no futuro
          if (err.statusCode === 410 || err.statusCode === 404) {
            subscriptionsParaRemover.push(subscription.endpoint);
          }
        }
      });

      await Promise.allSettled(sendPromises);

      // Remover assinaturas inválidas do banco de dados
      if (subscriptionsParaRemover.length > 0) {
        console.log(`🧹 Removendo ${subscriptionsParaRemover.length} assinaturas expiradas do usuário ${usuarioId}`);
        await User.findByIdAndUpdate(usuarioId, {
          $pull: {
            pushSubscriptions: { endpoint: { $in: subscriptionsParaRemover } }
          }
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Erro global ao enviar notificação push:', error);
      return false;
    }
  }

  // Limpar notificações antigas
  static async limparNotificacoesAntigas() {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30); // Manter apenas 30 dias

      const resultado = await Notificacao.deleteMany({
        createdAt: { $lt: dataLimite }
      });

      console.log(`Limpeza de notificações antigas: ${resultado.deletedCount} notificações removidas`);
    } catch (error) {
      console.error('Erro na limpeza de notificações antigas:', error);
    }
  }
}

module.exports = NotificationService;
