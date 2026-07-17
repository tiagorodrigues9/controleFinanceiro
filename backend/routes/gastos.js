const express = require('express');
const { body, validationResult } = require('express-validator');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const Cartao = require('../models/Cartao');
const ContaBancaria = require('../models/ContaBancaria');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { asyncHandler } = require('../utils/errors');
const socket = require('../utils/socket');
const { logger } = require('../utils/logger');
const { calcularDatasFatura, buscarOuCriarFaturaAberta } = require('../utils/faturaUtils');

const router = express.Router();

router.param('id', validateObjectId);

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/gastos
// @desc    Obter todos os gastos do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tipoDespesa, subgrupo, formaPagamento, dataInicio, dataFim } = req.query;
    const query = { usuario: req.user._id };

    if (tipoDespesa) {
      query['tipoDespesa.grupo'] = tipoDespesa;
    }

    if (subgrupo) {
      query['tipoDespesa.subgrupo'] = subgrupo;
    }

    if (formaPagamento) {
      query.formaPagamento = formaPagamento;
    }

    // Se não houver filtro de data, aplicar filtro dos últimos 5 dias
    if (dataInicio && dataFim) {
      // Criar datas em UTC para evitar problemas de timezone
      const [inicioYear, inicioMonth, inicioDay] = dataInicio.split('-').map(Number);
      const [fimYear, fimMonth, fimDay] = dataFim.split('-').map(Number);

      query.data = {
        $gte: new Date(Date.UTC(inicioYear, inicioMonth - 1, inicioDay, 0, 0, 0)),
        $lte: new Date(Date.UTC(fimYear, fimMonth - 1, fimDay, 23, 59, 59))
      };
    } else {
      // Aplicar filtro dos últimos 5 dias
      const hoje = new Date();
      const cincoDiasAtras = new Date(hoje);
      cincoDiasAtras.setDate(hoje.getDate() - 5);
      cincoDiasAtras.setHours(0, 0, 0, 0);
      hoje.setHours(23, 59, 59, 999);

      query.data = {
        $gte: cincoDiasAtras,
        $lte: hoje
      };
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [gastos, total] = await Promise.all([
      Gasto.find(query)
        .populate('tipoDespesa.grupo')
        .populate('contaBancaria')
        .sort({ data: -1 })
        .skip(skip)
        .limit(limit),
      Gasto.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Total-Pages', totalPages);

    res.json({
      items: gastos,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar gastos' });
  }
});

// @route   GET /api/gastos/:id
// @desc    Obter gasto específico
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const gasto = await Gasto.findOne({
      _id: req.params.id,
      usuario: req.user._id
    })
      .populate('tipoDespesa.grupo')
      .populate('contaBancaria');

    if (!gasto) {
      return res.status(404).json({ message: 'Gasto não encontrado' });
    }

    res.json(gasto);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar gasto' });
  }
});

// @route   POST /api/gastos
// @desc    Criar novo gasto
// @access  Private
router.post('/', [
  body('tipoDespesa.grupo').notEmpty().withMessage('Grupo é obrigatório'),
  body('tipoDespesa.subgrupo').notEmpty().withMessage('Subgrupo é obrigatório'),
  body('valor').isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a zero'),
  body('data').notEmpty().withMessage('Data é obrigatória'),
  body('formaPagamento').notEmpty().withMessage('Forma de pagamento é obrigatória'),
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tipoDespesa, valor, data, local, observacao, formaPagamento, contaBancaria, cartao } = req.body;
    
    // Validação customizada: cartão é obrigatório para pagamentos com cartão
    if ((formaPagamento === 'Cartão de Crédito' || formaPagamento === 'Cartão de Débito') && !cartao) {
      return res.status(400).json({ message: 'Cartão é obrigatório para pagamentos com cartão' });
    }

    // Validação de Conta Bancária (Prevenção de IDOR e conta inativa)
    if (formaPagamento !== 'Cartão de Crédito') {
      const contaValida = await ContaBancaria.findOne({ _id: contaBancaria, usuario: req.user._id, ativo: true });
      if (!contaValida) {
        return res.status(400).json({ message: 'Conta bancária inválida ou inativa.' });
      }
    }

    // Se for pagamento com cartão, verificar se o cartão existe
    let cartaoObj = null;
    if (cartao) {
      cartaoObj = await Cartao.findOne({ _id: cartao, usuario: req.user._id, ativo: true });
      if (!cartaoObj) {
        return res.status(400).json({ message: 'Cartão inválido ou inativo' });
      }
    }

    // Criar data em UTC para evitar problemas de timezone
    const [year, month, day] = data.split('-').map(Number);
    const dataParsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Processar valor com precisão de centavos (abordagem ultra-robusta para valores gigantescos)
    let valorProcessado = parseFloat(valor);
    if (isNaN(valorProcessado) || valorProcessado < 0) {
      return res.status(400).json({ message: 'Valor inválido' });
    }
    valorProcessado = Math.round(valorProcessado * 100) / 100;
    
    const gasto = await Gasto.create({
      tipoDespesa,
      valor: valorProcessado,
      data: dataParsed,
      local,
      observacao,
      formaPagamento,
      contaBancaria,
      cartao: cartaoObj ? cartaoObj._id : null,
      usuario: req.user._id
    });
    
    logger.debug('🔍 Debug - Gasto salvo:');
    logger.debug('  ID:', gasto._id);
    logger.debug('  Valor no objeto:', gasto.valor);
    logger.debug('  Tipo do valor:', typeof gasto.valor);

    // Criar registro no extrato apenas para pagamentos que afetam a conta bancária imediatamente
    if (formaPagamento !== 'Cartão de Crédito') {
      await Extrato.create({
        contaBancaria,
        cartao: cartaoObj ? cartaoObj._id : null,
        tipo: 'Saída',
        valor: Math.round(parseFloat(valor) * 100) / 100, // Precisão de centavos
        data: new Date(data),
        motivo: `Gasto: ${local || 'Sem local'}`,
        referencia: {
          tipo: 'Gasto',
          id: gasto._id
        },
        usuario: req.user._id
      });
    } else {
      // Para cartão de crédito, adicionar à fatura do cartão
      if (cartaoObj) {
        const FaturaCartao = require('../models/FaturaCartao');
        
        // Determinar o mês de referência da fatura com base na data do gasto
        const diaFech = cartaoObj.diaFatura || 25;
        const diaVenc = cartaoObj.diaVencimento || (diaFech + 3 > 28 ? 5 : diaFech + 3);
        const { dataVencimento, dataFechamento, mesReferencia } = calcularDatasFatura(dataParsed, diaFech, diaVenc);

        // Buscar ou criar fatura do mês (garantindo que esteja Aberta)
        let fatura = await buscarOuCriarFaturaAberta(
          cartaoObj._id, 
          req.user._id, 
          dataVencimento, 
          dataFechamento, 
          mesReferencia
        );

        // Adicionar despesa à fatura
        await fatura.adicionarDespesa(
          gasto._id,
          Math.round(parseFloat(valor) * 100) / 100,
          dataParsed,
          `Gasto: ${local || 'Sem local'}`
        );
      }
    }

    res.status(201).json(gasto);

    // Emitir evento websocket
    try {
      socket.getIO().to(req.user._id.toString()).emit('novo_gasto', gasto);
    } catch (e) {
      logger.warn('Erro ao emitir evento websocket novo_gasto', e);
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao criar gasto' });
  }
});

// @route   POST /api/gastos/:id/duplicar
// @desc    Duplicar gasto
// @access  Private
router.post('/:id/duplicar', async (req, res) => {
  try {
    const gastoOriginal = await Gasto.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!gastoOriginal) {
      return res.status(404).json({ message: 'Gasto não encontrado' });
    }

    const novoGasto = await Gasto.create({
      tipoDespesa: gastoOriginal.tipoDespesa,
      valor: gastoOriginal.valor,
      data: new Date(),
      local: gastoOriginal.local,
      observacao: gastoOriginal.observacao,
      formaPagamento: gastoOriginal.formaPagamento,
      contaBancaria: gastoOriginal.contaBancaria,
      usuario: req.user._id
    });

    // Criar registro no extrato apenas para pagamentos que afetam a conta bancária imediatamente
    if (novoGasto.formaPagamento !== 'Cartão de Crédito') {
      await Extrato.create({
        contaBancaria: novoGasto.contaBancaria,
        tipo: 'Saída',
        valor: novoGasto.valor,
        data: new Date(),
        motivo: `Gasto: ${novoGasto.local || 'Sem local'}`,
        referencia: {
          tipo: 'Gasto',
          id: novoGasto._id
        },
        usuario: req.user._id
      });
    } else {
      // Para cartão de crédito, adicionar à fatura do cartão
      if (novoGasto.cartao) {
        const FaturaCartao = require('../models/FaturaCartao');
        const Cartao = require('../models/Cartao');
        
        // Buscar o cartão para obter informações
        const cartaoObj = await Cartao.findOne({ _id: novoGasto.cartao, usuario: req.user._id, ativo: true });
        
        if (cartaoObj) {
          // Determinar o mês de referência da fatura
          const diaFech = cartaoObj.diaFatura || 25;
          const diaVenc = cartaoObj.diaVencimento || (diaFech + 3 > 28 ? 5 : diaFech + 3);
          const { dataVencimento, dataFechamento, mesReferencia } = calcularDatasFatura(new Date(), diaFech, diaVenc);

          // Buscar ou criar fatura do mês (garantindo que esteja Aberta)
          let fatura = await buscarOuCriarFaturaAberta(
            cartaoObj._id, 
            req.user._id, 
            dataVencimento, 
            dataFechamento, 
            mesReferencia
          );

          // Adicionar despesa à fatura
          await fatura.adicionarDespesa(
            novoGasto._id,
            novoGasto.valor,
            dataGasto,
            `Gasto: ${novoGasto.local || 'Sem local'}`
          );
        }
      }
    }

    res.status(201).json(novoGasto);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao duplicar gasto' });
  }
});

// @route   PUT /api/gastos/:id
// @desc    Atualizar gasto
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    const gasto = await Gasto.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!gasto) {
      return res.status(404).json({ message: 'Gasto não encontrado' });
    }

    const { tipoDespesa, valor, data, local, observacao, formaPagamento, contaBancaria } = req.body;

    // Verificar conta bancária se ela estiver sendo atualizada e não for cartão
    const novaForma = formaPagamento || gasto.formaPagamento;
    if (contaBancaria && novaForma !== 'Cartão de Crédito') {
      const contaValida = await ContaBancaria.findOne({ _id: contaBancaria, usuario: req.user._id, ativo: true });
      if (!contaValida) {
        return res.status(400).json({ message: 'Conta bancária inválida ou inativa.' });
      }
    }

    if (tipoDespesa) gasto.tipoDespesa = tipoDespesa;
    if (valor) gasto.valor = parseFloat(valor);
    if (data) gasto.data = new Date(data);
    if (local !== undefined) gasto.local = local;
    if (observacao !== undefined) gasto.observacao = observacao;
    if (formaPagamento) gasto.formaPagamento = formaPagamento;
    if (contaBancaria) gasto.contaBancaria = contaBancaria;

    await gasto.save();

    // Atualizar extrato correspondente
    if (gasto.formaPagamento !== 'Cartão de Crédito') {
      await Extrato.findOneAndUpdate(
        {
          'referencia.tipo': 'Gasto',
          'referencia.id': gasto._id,
          usuario: req.user._id
        },
        {
          $set: {
            valor: gasto.valor,
            data: gasto.data,
            contaBancaria: gasto.contaBancaria,
            motivo: `Gasto: ${gasto.local || 'Sem local'}`
          }
        }
      );
    }

    res.json(gasto);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao atualizar gasto' });
  }
});

// @route   DELETE /api/gastos/:id
// @desc    Excluir gasto
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const gasto = await Gasto.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!gasto) {
      return res.status(404).json({ message: 'Gasto não encontrado' });
    }

    // Estornar no extrato
    await Extrato.updateMany(
      {
        'referencia.tipo': 'Gasto',
        'referencia.id': gasto._id,
        usuario: req.user._id
      },
      { estornado: true }
    );

    await gasto.deleteOne();

    res.json({ message: 'Gasto excluído com sucesso' });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao excluir gasto' });
  }
});

module.exports = router;

