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
        .populate('cartao')
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
      .populate('contaBancaria')
      .populate('cartao');

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
  body('valor').isNumeric().withMessage('Valor deve ser numérico').custom(v => parseFloat(v) >= 0).withMessage('Valor deve ser maior ou igual a zero'),
  body('data').notEmpty().withMessage('Data é obrigatória'),
  body('formaPagamento').notEmpty().withMessage('Forma de pagamento é obrigatória'),
  body('contaBancaria').optional({ checkFalsy: true })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { tipoDespesa, valor, data, local, observacao, formaPagamento, contaBancaria, cartao, parcelas } = req.body;
    
    // Validação customizada: cartão é obrigatório para pagamentos com cartão
    if ((formaPagamento === 'Cartão de Crédito' || formaPagamento === 'Cartão de Débito') && !cartao) {
      return res.status(400).json({ message: 'Cartão é obrigatório para pagamentos com cartão' });
    }

    // Validação de Conta Bancária (Prevenção de IDOR e conta inativa)
    if (formaPagamento !== 'Cartão de Crédito') {
      if (!contaBancaria) {
        return res.status(400).json({ message: 'Conta bancária é obrigatória para esta forma de pagamento' });
      }
      const contaValida = await ContaBancaria.findOne({ _id: contaBancaria, usuario: req.user._id, ativo: true });
      if (!contaValida) {
        return res.status(400).json({ message: 'Conta bancária inválida ou inativa.' });
      }
    }

    // Se for pagamento com cartão, verificar se o cartão existe e está ativo
    let cartaoObj = null;
    if (cartao) {
      cartaoObj = await Cartao.findOne({ _id: cartao, usuario: req.user._id, ativo: true });
      if (!cartaoObj) {
        return res.status(400).json({ message: 'Cartão inválido ou inativo' });
      }
    }

    // Preparação do motor de parcelamento
    const totalParcelas = Math.max(1, parseInt(parcelas) || 1);
    let valorProcessado = parseFloat(valor);
    
    if (isNaN(valorProcessado) || valorProcessado < 0) {
      return res.status(400).json({ message: 'Valor inválido' });
    }
    
    valorProcessado = Math.round(valorProcessado * 100) / 100;
    
    // Lógica para divisão exata de parcelas, jogando possíveis dízimas residuais para a 1ª parcela
    let valorParcelaBase = valorProcessado;
    let valorResto = 0;
    
    if (formaPagamento === 'Cartão de Crédito' && totalParcelas > 1) {
      valorParcelaBase = Math.floor((valorProcessado / totalParcelas) * 100) / 100;
      valorResto = Math.round((valorProcessado - (valorParcelaBase * totalParcelas)) * 100) / 100;
    }

    // Date em UTC puro
    const [year, month, day] = data.split('-').map(Number);
    const dataBaseParsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    let gastosCriados = [];

    // RAMIFICAÇÃO: Cartão de Crédito (Parcelado ou À Vista) vs Dinheiro/Débito
    if (formaPagamento === 'Cartão de Crédito') {
      const FaturaCartao = require('../models/FaturaCartao');

      for (let i = 1; i <= totalParcelas; i++) {
        let valorDessaParcela = valorParcelaBase;
        if (i === 1) valorDessaParcela += valorResto;
        
        let obsParcela = observacao || '';
        if (totalParcelas > 1) {
          obsParcela = obsParcela ? `${obsParcela} (${i}/${totalParcelas})` : `Parcela ${i}/${totalParcelas}`;
        }

        // Calcular a data que este gasto afetará, apenas avançando os meses
        let dataDaFatura = new Date(dataBaseParsed);
        dataDaFatura.setMonth(dataDaFatura.getMonth() + (i - 1));

        const gasto = await Gasto.create({
          tipoDespesa,
          valor: Math.round(valorDessaParcela * 100) / 100,
          data: dataDaFatura,
          local,
          observacao: obsParcela,
          formaPagamento,
          contaBancaria: contaBancaria || undefined,
          cartao: cartaoObj._id,
          usuario: req.user._id
        });
        
        gastosCriados.push(gasto);

        // CORREÇÃO CRÍTICA: buscarOuCriarFaturaAberta recebe (cartaoModel, usuarioId, baseDataReferencia)
        let fatura = await buscarOuCriarFaturaAberta(
          cartaoObj,
          req.user._id, 
          dataDaFatura
        );

        await fatura.adicionarDespesa(
          gasto._id,
          gasto.valor,
          dataDaFatura,
          `Gasto: ${local || 'Sem local'} ${totalParcelas > 1 ? `(${i}/${totalParcelas})` : ''}`
        );
      }
    } else {
      // RAMIFICAÇÃO: Operações convencionais (Gasto Único de Débito, Pix, etc)
      const gasto = await Gasto.create({
        tipoDespesa,
        valor: valorProcessado,
        data: dataBaseParsed,
        local,
        observacao,
        formaPagamento,
        contaBancaria: contaBancaria || undefined,
        cartao: cartaoObj ? cartaoObj._id : undefined,
        usuario: req.user._id
      });
      
      gastosCriados.push(gasto);

      // Desconta imediatamente do extrato bancário
      await Extrato.create({
        contaBancaria,
        cartao: cartaoObj ? cartaoObj._id : null,
        tipo: 'Saída',
        valor: valorProcessado,
        data: dataBaseParsed,
        motivo: `Gasto: ${local || 'Sem local'}`,
        referencia: {
          tipo: 'Gasto',
          id: gasto._id
        },
        usuario: req.user._id
      });
    }

    res.status(201).json(gastosCriados[0]); // Retorna o primeiro p/ feedback visual básico do frontend

    try {
      socket.getIO().to(req.user._id.toString()).emit('novo_gasto', gastosCriados[0]);
    } catch (e) {
      logger.warn('Erro ao emitir evento websocket novo_gasto', e);
    }
  } catch (error) {
    logger.error('Erro na criação de Gasto:', error);
    res.status(500).json({ message: 'Erro ao criar gasto(s)' });
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

    const hoje = new Date();
    const dataParsed = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0));

    const novoGasto = await Gasto.create({
      tipoDespesa: gastoOriginal.tipoDespesa,
      valor: gastoOriginal.valor,
      data: dataParsed,
      local: gastoOriginal.local,
      observacao: gastoOriginal.observacao ? `${gastoOriginal.observacao} (Cópia)` : '(Cópia)',
      formaPagamento: gastoOriginal.formaPagamento,
      contaBancaria: gastoOriginal.contaBancaria,
      cartao: gastoOriginal.cartao,
      usuario: req.user._id
    });

    // Criar registro no extrato apenas para pagamentos que afetam a conta bancária imediatamente
    if (novoGasto.formaPagamento !== 'Cartão de Crédito') {
      await Extrato.create({
        contaBancaria: novoGasto.contaBancaria,
        cartao: novoGasto.cartao,
        tipo: 'Saída',
        valor: novoGasto.valor,
        data: dataParsed,
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
        
        const cartaoObj = await Cartao.findOne({ _id: novoGasto.cartao, usuario: req.user._id, ativo: true });
        
        if (cartaoObj) {
          // CORREÇÃO CRÍTICA: Mesma assinatura do POST normal
          let fatura = await buscarOuCriarFaturaAberta(
            cartaoObj, 
            req.user._id, 
            dataParsed
          );

          await fatura.adicionarDespesa(
            novoGasto._id,
            novoGasto.valor,
            dataParsed,
            `Gasto: ${novoGasto.local || 'Sem local'}`
          );
        }
      }
    }

    try {
      socket.getIO().to(req.user._id.toString()).emit('novo_gasto', novoGasto);
    } catch (e) {
      logger.warn('Erro ao emitir evento websocket novo_gasto', e);
    }

    res.status(201).json(novoGasto);
  } catch (error) {
    logger.error('Erro na duplicação:', error);
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

    const { tipoDespesa, valor, data, local, observacao, formaPagamento, contaBancaria, cartao } = req.body;

    // Bloqueio de mudança de forma de pagamento REMOVIDO a pedido do usuário
    // if (formaPagamento && formaPagamento !== gasto.formaPagamento) { ... }

    const valorAntigo = gasto.valor;
    const wasCartaoCredito = gasto.formaPagamento === 'Cartão de Crédito';

    if (tipoDespesa) gasto.tipoDespesa = tipoDespesa;
    
    let novoValorProcessado = gasto.valor;
    if (valor !== undefined) {
      novoValorProcessado = Math.round(parseFloat(valor) * 100) / 100;
      if (isNaN(novoValorProcessado) || novoValorProcessado < 0) return res.status(400).json({ message: 'Valor inválido' });
      gasto.valor = novoValorProcessado;
    }

    if (data) {
      const [year, month, day] = data.split('-').map(Number);
      gasto.data = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    }
    
    if (local !== undefined) gasto.local = local;
    if (observacao !== undefined) gasto.observacao = observacao;
    if (formaPagamento !== undefined) gasto.formaPagamento = formaPagamento;
    if (contaBancaria !== undefined) gasto.contaBancaria = contaBancaria || undefined;
    if (cartao !== undefined) gasto.cartao = cartao || undefined;

    const isNowCartaoCredito = gasto.formaPagamento === 'Cartão de Crédito';

    // 1. Limpeza de dados mutuamente exclusivos para manter o BD limpo
    if (isNowCartaoCredito) {
      gasto.contaBancaria = undefined;
    } else if (gasto.formaPagamento !== 'Cartão de Débito') {
      gasto.cartao = undefined;
    }

    // 2. Validação se mudou para cartão
    let cartaoObj = null;
    if (isNowCartaoCredito || (gasto.formaPagamento === 'Cartão de Débito' && gasto.cartao)) {
      const Cartao = require('../models/Cartao');
      cartaoObj = await Cartao.findOne({ _id: gasto.cartao, usuario: req.user._id, ativo: true });
      if (!cartaoObj) return res.status(400).json({ message: 'Cartão inválido ou inativo' });
    }

    await gasto.save();

    // ==========================================
    // RECONCILIAÇÃO FINANCEIRA DE FORMA DE PAGTO
    // ==========================================

    // PASSO A: Desfazer a forma de pagamento antiga
    if (wasCartaoCredito) {
      // Remover da Fatura Antiga
      const FaturaCartao = require('../models/FaturaCartao');
      const faturaAntiga = await FaturaCartao.findOne({
        usuario: req.user._id,
        'despesas.conta': gasto._id
      });
      if (faturaAntiga) {
        faturaAntiga.valorTotal = Math.round((faturaAntiga.valorTotal - valorAntigo) * 100) / 100;
        if (faturaAntiga.valorTotal < 0) faturaAntiga.valorTotal = 0;
        faturaAntiga.despesas = faturaAntiga.despesas.filter(d => d.conta && d.conta.toString() !== gasto._id.toString());
        await faturaAntiga.save();
      }
    } else {
      // Se era não-crédito e agora É crédito, não precisamos mais do extrato de Saída (vamos estornar/ocultar)
      if (isNowCartaoCredito) {
        await Extrato.updateMany(
          { 'referencia.tipo': 'Gasto', 'referencia.id': gasto._id, usuario: req.user._id },
          { estornado: true }
        );
      }
    }

    // PASSO B: Aplicar a nova forma de pagamento
    if (isNowCartaoCredito) {
      // Inserir na Fatura Nova
      if (cartaoObj) {
        const faturaNova = await buscarOuCriarFaturaAberta(cartaoObj, req.user._id, gasto.data);
        await faturaNova.adicionarDespesa(
          gasto._id,
          novoValorProcessado,
          gasto.data,
          `Gasto: ${gasto.local || 'Sem local'}`
        );
      }
    } else {
      if (wasCartaoCredito) {
        // Se era crédito, não havia extrato! Precisamos criar um agora.
        await Extrato.create({
          contaBancaria: gasto.contaBancaria,
          cartao: (gasto.formaPagamento === 'Cartão de Débito' && gasto.cartao) ? gasto.cartao : null,
          tipo: 'Saída',
          valor: novoValorProcessado,
          data: gasto.data,
          motivo: `Gasto: ${gasto.local || 'Sem local'}`,
          referencia: { tipo: 'Gasto', id: gasto._id },
          usuario: req.user._id
        });
      } else {
        // Era não-crédito, e continuou não-crédito: Apenas atualizar o extrato existente!
        await Extrato.findOneAndUpdate(
          { 'referencia.tipo': 'Gasto', 'referencia.id': gasto._id, usuario: req.user._id },
          {
            $set: {
              valor: gasto.valor,
              data: gasto.data,
              contaBancaria: gasto.contaBancaria,
              cartao: (gasto.formaPagamento === 'Cartão de Débito' && gasto.cartao) ? gasto.cartao : null,
              motivo: `Gasto: ${gasto.local || 'Sem local'}`
            }
          }
        );
      }
    }

    res.json(gasto);
  } catch (error) {
    logger.error('Erro na edição de Gasto:', error);
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

    const valorEstornado = gasto.valor;

    if (gasto.formaPagamento !== 'Cartão de Crédito') {
      // Estornar no extrato
      await Extrato.updateMany(
        {
          'referencia.tipo': 'Gasto',
          'referencia.id': gasto._id,
          usuario: req.user._id
        },
        { estornado: true }
      );
    } else {
      // Remover da Fatura de Cartão
      const FaturaCartao = require('../models/FaturaCartao');
      const faturaAlvo = await FaturaCartao.findOne({
        usuario: req.user._id,
        'despesas.conta': gasto._id
      });
      
      if (faturaAlvo) {
        // Reduzir o total e remover do array
        faturaAlvo.valorTotal = Math.round((faturaAlvo.valorTotal - valorEstornado) * 100) / 100;
        if (faturaAlvo.valorTotal < 0) faturaAlvo.valorTotal = 0;
        
        faturaAlvo.despesas = faturaAlvo.despesas.filter(d => d.conta && d.conta.toString() !== gasto._id.toString());
        await faturaAlvo.save();
      }
    }

    await gasto.deleteOne();

    res.json({ message: 'Gasto excluído com sucesso' });
  } catch (error) {
    logger.error('Erro ao excluir gasto:', error);
    res.status(500).json({ message: 'Erro ao excluir gasto' });
  }
});

module.exports = router;

