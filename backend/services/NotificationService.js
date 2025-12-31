const mongoose = require('mongoose');
const Notificacao = require('../models/Notificacao');
const Conta = require('../models/Conta');
const Cartao = require('../models/Cartao');
const Gasto = require('../models/Gasto');
const User = require('../models/User');

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
      
      if (!config?.contasVencidas) {
        console.log(`❌ Usuário ${usuarioId} não quer notificações de contas vencidas`);
        return;
      }
      
      // Buscar contas vencidas
      const contasVencidas = await Conta.find({
        usuario: usuarioId,
        dataVencimento: { $lt: hoje },
        status: { $in: ['Pendente', 'Vencida'] },
        ativo: { $ne: false }
      }).populate('fornecedor');

      console.log(`📅 Contas vencidas encontradas: ${contasVencidas.length}`);
      contasVencidas.forEach((conta, index) => {
        console.log(`   ${index + 1}. ${conta.nome} - ${conta.fornecedor?.nome} - Vencimento: ${conta.dataVencimento} - Status: ${conta.status}`);
      });

      // Buscar contas próximas ao vencimento
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

      // Gerar notificações para contas vencidas
      for (const conta of contasVencidas) {
        console.log(`🔔 Processando conta vencida: ${conta.nome} - ${conta.fornecedor?.nome}`);
        console.log(`   - ID da conta: ${conta._id}`);
        console.log(`   - ID da conta (string): ${conta._id.toString()}`);
        
        await this.criarNotificacao(
          usuarioId,
          'conta_vencida',
          'Conta Vencida',
          `Sua conta "${conta.nome}" do fornecedor ${conta.fornecedor?.nome} está vencida. Valor: R$ ${conta.valor.toFixed(2).replace('.', ',')}`,
          'Conta',
          conta._id.toString()
        );
      }

      // Gerar notificações para contas próximas
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
        'configuracoes.notificacoes.ativo': true 
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
      // Em produção, aqui você buscaria a inscrição push do usuário
      // e usaria Web Push Protocol para enviar
      
      console.log(`📱 Enviando notificação push para usuário ${usuarioId}:`);
      console.log(`   - Título: ${titulo}`);
      console.log(`   - Mensagem: ${mensagem}`);
      console.log(`   - URL: ${url}`);
      
      // Simulação - em produção você usaria:
      // const webpush = require('web-push');
      // await webpush.sendNotification(subscription, payload);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar notificação push:', error);
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
