const express = require('express');
const { body, validationResult } = require('express-validator');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const Cartao = require('../models/Cartao');
const auth = require('../middleware/auth');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/gastos
// @desc    Obter todos os gastos do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { tipoDespesa, dataInicio, dataFim } = req.query;
    const query = { usuario: req.user._id };

    if (tipoDespesa) {
      query['tipoDespesa.grupo'] = tipoDespesa;
    }

    if (dataInicio && dataFim) {
      // Criar datas em UTC para evitar problemas de timezone
      const [inicioYear, inicioMonth, inicioDay] = dataInicio.split('-').map(Number);
      const [fimYear, fimMonth, fimDay] = dataFim.split('-').map(Number);

      query.data = {
        $gte: new Date(Date.UTC(inicioYear, inicioMonth - 1, inicioDay, 0, 0, 0)),
        $lte: new Date(Date.UTC(fimYear, fimMonth - 1, fimDay, 23, 59, 59))
      };
    }

    const gastos = await Gasto.find(query)
      .populate('tipoDespesa.grupo')
      .populate('contaBancaria')
      .sort({ data: -1 });

    res.json(gastos);
  } catch (error) {
    console.error(error);
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
    console.error(error);
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

    const gasto = await Gasto.create({
      tipoDespesa,
      valor: parseFloat(valor),
      data: dataParsed,
      local,
      observacao,
      formaPagamento,
      contaBancaria,
      cartao: cartaoObj ? cartaoObj._id : null,
      usuario: req.user._id
    });

    // Criar registro no extrato
    await Extrato.create({
      contaBancaria,
      cartao: cartaoObj ? cartaoObj._id : null,
      tipo: 'Saída',
      valor: parseFloat(valor),
      data: new Date(data),
      motivo: `Gasto: ${local || 'Sem local'}`,
      referencia: {
        tipo: 'Gasto',
        id: gasto._id
      },
      usuario: req.user._id
    });

    res.status(201).json(gasto);
  } catch (error) {
    console.error(error);
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

    // Criar registro no extrato
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

    res.status(201).json(novoGasto);
  } catch (error) {
    console.error(error);
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

    if (tipoDespesa) gasto.tipoDespesa = tipoDespesa;
    if (valor) gasto.valor = parseFloat(valor);
    if (data) gasto.data = new Date(data);
    if (local !== undefined) gasto.local = local;
    if (observacao !== undefined) gasto.observacao = observacao;
    if (formaPagamento) gasto.formaPagamento = formaPagamento;
    if (contaBancaria) gasto.contaBancaria = contaBancaria;

    await gasto.save();

    res.json(gasto);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir gasto' });
  }
});

module.exports = router;

