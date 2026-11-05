const express = require('express');
const mongoose = require('mongoose');
const NotificacaoProgramada = require('../models/NotificacaoProgramada');
const NotificationService = require('../services/NotificationService');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Todas as rotas exigem autenticação E permissão exclusiva de administrador
router.use(auth);
router.use(adminAuth);

// @route   GET /api/notificacoes-programadas
// @desc    Listar todas as notificações programadas
// @access  Admin
router.get('/', async (req, res) => {
  try {
    const programadas = await NotificacaoProgramada.find()
      .sort({ createdAt: -1 })
      .populate('criadoPor', 'nome email');
    res.json(programadas);
  } catch (error) {
    logger.error('Erro ao listar notificações programadas:', error);
    res.status(500).json({ message: 'Erro ao buscar programações de notificação' });
  }
});

// @route   POST /api/notificacoes-programadas
// @desc    Criar uma nova notificação programada
// @access  Admin
router.post('/', async (req, res) => {
  try {
    const {
      titulo,
      mensagem,
      tipoFrequencia,
      horario,
      diasSemana,
      dataEspecifica,
      ativo,
      urlDestino
    } = req.body;

    if (!titulo || !mensagem || !horario) {
      return res.status(400).json({ message: 'Título, mensagem e horário são obrigatórios' });
    }

    // Validar formato do horário (HH:mm)
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(horario)) {
      return res.status(400).json({ message: 'Formato de horário inválido. Use HH:mm (ex: 09:00)' });
    }

    if (tipoFrequencia === 'dias_semana' && (!Array.isArray(diasSemana) || diasSemana.length === 0)) {
      return res.status(400).json({ message: 'Selecione pelo menos um dia da semana para o envio' });
    }

    if (tipoFrequencia === 'data_especifica' && (!dataEspecifica || isNaN(new Date(dataEspecifica).getTime()))) {
      return res.status(400).json({ message: 'Data específica inválida ou não informada' });
    }

    const novaProgramacao = new NotificacaoProgramada({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      tipoFrequencia: tipoFrequencia || 'diaria',
      horario,
      diasSemana: Array.isArray(diasSemana) ? diasSemana : [0, 1, 2, 3, 4, 5, 6],
      dataEspecifica: dataEspecifica ? new Date(dataEspecifica) : undefined,
      ativo: ativo !== undefined ? ativo : true,
      urlDestino: urlDestino || '/gastos-diarios',
      criadoPor: req.user._id
    });

    await novaProgramacao.save();

    logger.info(`Notificação programada criada com sucesso pelo admin ${req.user.email}: "${titulo}" às ${horario}`);
    res.status(201).json(novaProgramacao);
  } catch (error) {
    logger.error('Erro ao criar notificação programada:', error);
    res.status(500).json({ message: 'Erro ao criar notificação programada' });
  }
});

// @route   PUT /api/notificacoes-programadas/:id
// @desc    Editar uma notificação programada existente
// @access  Admin
router.put('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID de notificação programada inválido' });
  }

  try {
    const programada = await NotificacaoProgramada.findById(req.params.id);
    if (!programada) {
      return res.status(404).json({ message: 'Notificação programada não encontrada' });
    }

    const {
      titulo,
      mensagem,
      tipoFrequencia,
      horario,
      diasSemana,
      dataEspecifica,
      ativo,
      urlDestino
    } = req.body;

    if (titulo) programada.titulo = titulo.trim();
    if (mensagem) programada.mensagem = mensagem.trim();
    if (tipoFrequencia) programada.tipoFrequencia = tipoFrequencia;
    if (tipoFrequencia === 'dias_semana' && Array.isArray(diasSemana) && diasSemana.length === 0) {
      return res.status(400).json({ message: 'Selecione pelo menos um dia da semana para o envio' });
    }
    if (horario) {
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(horario)) {
        return res.status(400).json({ message: 'Formato de horário inválido. Use HH:mm (ex: 09:00)' });
      }
      programada.horario = horario;
    }
    if (Array.isArray(diasSemana)) programada.diasSemana = diasSemana;
    if (dataEspecifica !== undefined) programada.dataEspecifica = dataEspecifica ? new Date(dataEspecifica) : null;
    if (ativo !== undefined) programada.ativo = ativo;
    if (urlDestino !== undefined) programada.urlDestino = urlDestino;

    await programada.save();

    logger.info(`Notificação programada "${programada.titulo}" atualizada pelo admin.`);
    res.json(programada);
  } catch (error) {
    logger.error('Erro ao atualizar notificação programada:', error);
    res.status(500).json({ message: 'Erro ao atualizar notificação programada' });
  }
});

// @route   PATCH /api/notificacoes-programadas/:id/toggle
// @desc    Ligar/Desligar uma notificação programada
// @access  Admin
router.patch('/:id/toggle', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID de notificação inválido' });
  }

  try {
    const programada = await NotificacaoProgramada.findById(req.params.id);
    if (!programada) {
      return res.status(404).json({ message: 'Notificação programada não encontrada' });
    }

    programada.ativo = !programada.ativo;
    await programada.save();

    res.json({
      message: `Notificação programada ${programada.ativo ? 'ativada' : 'desativada'} com sucesso`,
      ativo: programada.ativo
    });
  } catch (error) {
    logger.error('Erro ao alternar status da notificação programada:', error);
    res.status(500).json({ message: 'Erro ao alternar status da notificação programada' });
  }
});

// @route   DELETE /api/notificacoes-programadas/:id
// @desc    Excluir uma notificação programada
// @access  Admin
router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID de notificação inválido' });
  }

  try {
    const programada = await NotificacaoProgramada.findById(req.params.id);
    if (!programada) {
      return res.status(404).json({ message: 'Notificação programada não encontrada' });
    }

    await NotificacaoProgramada.deleteOne({ _id: req.params.id });

    logger.info(`Notificação programada "${programada.titulo}" excluída com sucesso.`);
    res.json({ message: 'Notificação programada excluída com sucesso' });
  } catch (error) {
    logger.error('Erro ao excluir notificação programada:', error);
    res.status(500).json({ message: 'Erro ao excluir notificação programada' });
  }
});

// @route   POST /api/notificacoes-programadas/:id/disparar-agora
// @desc    Disparar teste imediato para todos os usuários inscritos
// @access  Admin
router.post('/:id/disparar-agora', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'ID de notificação inválido' });
  }

  try {
    const programada = await NotificacaoProgramada.findById(req.params.id);
    if (!programada) {
      return res.status(404).json({ message: 'Notificação programada não encontrada' });
    }

    logger.info(`Admin disparando broadcast imediato da notificação: "${programada.titulo}"`);
    
    const resultado = await NotificationService.enviarBroadcast(
      programada.titulo,
      programada.mensagem,
      programada.urlDestino || '/gastos-diarios',
      programada._id
    );

    // Gravar no histórico
    programada.ultimaExecucao = new Date();
    if (!programada.historicoEnvios) {
      programada.historicoEnvios = [];
    }
    programada.historicoEnvios.push({
      data: new Date(),
      totalEnviados: resultado.totalEnviados,
      falhas: resultado.falhas
    });
    await programada.save();

    res.json({
      message: 'Disparo executado com sucesso!',
      resultado
    });
  } catch (error) {
    logger.error('Erro ao disparar notificação programada imediatamente:', error);
    res.status(500).json({ message: 'Erro ao disparar notificação programada' });
  }
});

module.exports = router;

