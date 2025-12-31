  const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Conta = require('../models/Conta');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

const router = express.Router();

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/contas
// @desc    Obter todas as contas do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { mes, ano, ativo, status, dataInicio, dataFim } = req.query;
    const query = { usuario: req.user._id, valor: { $ne: null } };

    // filtro por mês/ano (dataVencimento)
    if (mes && ano) {
      const startDate = new Date(ano, mes - 1, 1);
      const endDate = new Date(ano, mes, 0, 23, 59, 59);
      query.dataVencimento = { $gte: startDate, $lte: endDate };
    }

    // filtro ativo: 'ativas' | 'inativas' | 'todas'
    if (ativo === 'ativas') query.ativo = { $ne: false };
    if (ativo === 'inativas') query.ativo = false;

    // filtro status: 'pendentes' | 'pagas' | 'vencidas' | 'todos'
    if (status === 'pendentes') query.status = 'Pendente';
    if (status === 'pagas') query.status = 'Pago';
    if (status === 'vencidas') query.status = 'Vencida';

    // filtro por intervalo arbitrário
    if (dataInicio) {
      const inicio = new Date(dataInicio);
      query.dataVencimento = query.dataVencimento || {};
      query.dataVencimento.$gte = inicio;
    }
    if (dataFim) {
      const fim = new Date(dataFim);
      fim.setHours(23,59,59,999);
      query.dataVencimento = query.dataVencimento || {};
      query.dataVencimento.$lte = fim;
    }

    logger.info('Buscando contas', { userId: req.user._id, filters: { mes, ano, ativo, status } });

    // Atualizar status de contas vencidas
    await Conta.updateMany(
      {
        usuario: req.user._id,
        status: 'Pendente',
        dataVencimento: { $lt: new Date() },
        ativo: { $ne: false }
      },
      { status: 'Vencida' }
    );

    const contas = await Conta.find(query)
      .populate('fornecedor')
      .populate('contaBancaria')
      .sort({ dataVencimento: 1 });

    logger.info('Contas encontradas', { count: contas.length });
    res.json(contas);
  } catch (error) {
    logger.error('Erro ao buscar contas', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao buscar contas' });
  }
});

// @route   GET /api/contas/:id
// @desc    Obter conta específica
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id
    })
      .populate('fornecedor')
      .populate('contaBancaria');

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    res.json(conta);
  } catch (error) {
    logger.error('Erro ao buscar conta', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao buscar conta' });
  }
});

// @route   POST /api/contas
// @desc    Criar nova conta
// @access  Private
router.post('/', upload.single('anexo'), [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('dataVencimento').optional().notEmpty().withMessage('Data de vencimento é obrigatória'),
  body('valor').optional().isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a zero'),
  body('fornecedor').notEmpty().withMessage('Fornecedor é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome, dataVencimento, valor, fornecedor, observacao, totalParcelas, parcelaId, parcelMode, parcelas, tipoControle } = req.body;

    logger.info('Cadastrando conta', { nome, dataVencimento, valor, fornecedor, userId: req.user._id });

    let dataVencimentoParsed;
    if (dataVencimento) {
      const [year, month, day] = dataVencimento.split('-').map(Number);
      dataVencimentoParsed = new Date(year, month - 1, day, 12, 0, 0);
    }

    const contaData = {
      nome,
      dataVencimento: dataVencimentoParsed,
      valor: parseFloat(valor),
      fornecedor,
      observacao,
      tipoControle,
      usuario: req.user._id,
      status: 'Pendente'
    };

    if (req.file) {
      contaData.anexo = req.file.path;
    }

    if (parcelMode === 'manual') {
      const parcelasList = JSON.parse(parcelas);
      const parcelaIdFinal = Date.now().toString();
      for (let i = 0; i < parcelasList.length; i++) {
        const parcela = parcelasList[i];
        const [year, month, day] = parcela.data.split('-').map(Number);
        const dataParcela = new Date(year, month - 1, day, 12, 0, 0);
        const parcelaData = {
          nome: `${nome} - Parcela ${i + 1}`,
          dataVencimento: dataParcela,
          valor: parseFloat(parcela.valor),
          fornecedor,
          observacao,
          tipoControle,
          usuario: req.user._id,
          status: 'Pendente',
          parcelaAtual: i + 1,
          totalParcelas: parcelasList.length,
          parcelaId: parcelaIdFinal
        };
        if (req.file) {
          parcelaData.anexo = req.file.path;
        }
        const newParcela = new Conta(parcelaData);
        await newParcela.save();
      }
      res.json({ message: 'Parcelas criadas com sucesso' });
    } else {
      // Se for parcelamento normal
      if (totalParcelas && totalParcelas > 1) {
      const parcelas = [];
      const parcelaIdFinal = parcelaId || Date.now().toString();
      let valorParcela;
      const dataBase = new Date(dataVencimentoParsed);

      if (parcelMode === 'mesmo_valor') {
        valorParcela = parseFloat(valor);
      } else {
        // dividir or manual, default to dividir
        valorParcela = parseFloat(valor) / parseInt(totalParcelas);
      }

      for (let i = 1; i <= totalParcelas; i++) {
        const dataVencimentoParcela = new Date(dataBase);
        dataVencimentoParcela.setMonth(dataVencimentoParcela.getMonth() + (i - 1));

        const parcela = {
          ...contaData,
          nome: `${nome} - Parcela ${i} de ${totalParcelas}`,
          valor: valorParcela,
          dataVencimento: dataVencimentoParcela,
          parcelaAtual: i,
          totalParcelas: parseInt(totalParcelas),
          parcelaId: parcelaIdFinal
        };

        parcelas.push(parcela);
      }

      const contasCriadas = await Conta.insertMany(parcelas);
      logger.info('Contas parceladas criadas', { count: contasCriadas.length });
      return res.status(201).json(contasCriadas);
    }

    const conta = await Conta.create(contaData);
    logger.info('Conta criada com sucesso', { contaId: conta._id });
    res.status(201).json(conta);
  } catch (error) {
    logger.error('Erro ao criar conta', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao criar conta' });
  }
});

// @route   PUT /api/contas/:id
// @desc    Atualizar conta
// @access  Private
router.put('/:id', upload.single('anexo'), async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      ativo: { $ne: false }
    });

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    if (conta.status === 'Pago') {
      return res.status(400).json({ message: 'Contas pagas não podem ser editadas' });
    }

    const { nome, dataVencimento, valor, fornecedor, observacao } = req.body;

    if (nome) conta.nome = nome;
    if (dataVencimento) conta.dataVencimento = new Date(dataVencimento);
    if (valor) conta.valor = parseFloat(valor);
    if (fornecedor) conta.fornecedor = fornecedor;
    if (observacao !== undefined) conta.observacao = observacao;
    if (req.file) conta.anexo = req.file.path;

    await conta.save();

    res.json(conta);
  } catch (error) {
    logger.error('Erro ao atualizar conta', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao atualizar conta' });
  }
});

// @route   DELETE /api/contas/:id
// @desc    Cancelar conta
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    // Check if there are remaining active installments
    let hasRemainingInstallments = false;
    let remainingCount = 0;
    
    if (conta.parcelaId) {
      const remainingInstallments = await Conta.find({
        parcelaId: conta.parcelaId,
        usuario: req.user._id,
        ativo: { $ne: false },
        _id: { $ne: conta._id } // Excluir a conta atual
      });
      remainingCount = remainingInstallments.length;
      hasRemainingInstallments = remainingCount > 0;
    }

    if (hasRemainingInstallments) {
      return res.json({
        hasRemainingInstallments: true,
        remainingCount,
        message: `Existem ${remainingCount} parcela(s) restante(s) deste grupo. Deseja cancelar apenas esta ou todas as restantes?`
      });
    }

    // Soft inactivate: set ativo=false and status to 'Cancelada' for clarity
    conta.ativo = false;
    conta.status = 'Cancelada';
    await conta.save();

    res.json({ message: 'Conta inativada com sucesso' });
  } catch (error) {
    logger.error('Erro ao cancelar conta', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erro ao cancelar conta' });
  }
});

// @route   DELETE /api/contas/:id/hard-all-remaining
// @desc    Excluir permanentemente todas as parcelas do mesmo grupo
// @access  Private
router.delete('/:id/hard-all-remaining', async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      parcelaId: { $exists: true }
    });

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada ou não pertence a um grupo de parcelas' });
    }
    
    // Excluir permanentemente todas as parcelas do mesmo parcelaId
    const result = await Conta.deleteMany({
      parcelaId: conta.parcelaId,
      usuario: req.user._id
    });

    res.json({ 
      message: 'Todas as parcelas foram excluídas permanentemente com sucesso',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir parcelas permanentemente' });
  }
});

// @route   DELETE /api/contas/:id/cancel-all-remaining
// @desc    Cancelar todas as parcelas do mesmo grupo
// @access  Private
router.delete('/:id/cancel-all-remaining', async (req, res) => {
  try {
    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      parcelaId: { $exists: true }
    });

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada ou não pertence a um grupo de parcelas' });
    }

    // Cancelar todas as parcelas do mesmo parcelaId
    await Conta.updateMany(
      {
        parcelaId: conta.parcelaId,
        usuario: req.user._id,
        ativo: { $ne: false }
      },
      {
        ativo: false,
        status: 'Cancelada'
      }
    );

    res.json({ message: 'Todas as parcelas foram canceladas com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao cancelar parcelas' });
  }
});

// @route   DELETE /api/contas/:id/hard
// @desc    Excluir conta fisicamente (apenas usuário dono)
// @access  Private
router.delete('/:id/hard', async (req, res) => {
  try {
    const conta = await Conta.findOne({ _id: req.params.id, usuario: req.user._id });
    if (!conta) return res.status(404).json({ message: 'Conta não encontrada' });

    await Conta.deleteOne({ _id: conta._id });
    res.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao excluir conta' });
  }
});

// @route   POST /api/contas/:id/pagar
// @desc    Pagar conta
// @access  Private
router.post('/:id/pagar', [
  body('formaPagamento').notEmpty().withMessage('Forma de pagamento é obrigatória'),
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const conta = await Conta.findOne({
      _id: req.params.id,
      usuario: req.user._id,
      ativo: { $ne: false }
    }).populate('fornecedor');

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    if (conta.status === 'Pago') {
      return res.status(400).json({ message: 'Conta já foi paga' });
    }

    if (conta.status === 'Cancelada') {
      return res.status(400).json({ message: 'Conta cancelada não pode ser paga' });
    }

    const { formaPagamento, contaBancaria, juros } = req.body;
    // Verificar se conta bancária informada existe e está ativa
    const contaBancariaObj = await ContaBancaria.findOne({ _id: contaBancaria, usuario: req.user._id, ativo: { $ne: false } });
    if (!contaBancariaObj) {
      return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
    }

    // Usar transação para garantir consistência (pagar conta + criar extrato atomicamente)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      conta.status = 'Pago';
      conta.dataPagamento = new Date();
      conta.formaPagamento = formaPagamento;
      conta.contaBancaria = contaBancaria;
      if (juros) {
        conta.jurosPago = parseFloat(juros);
      }
      await conta.save({ session });

      // Criar registro no extrato
      const valorPago = conta.valor + (conta.jurosPago || 0);
      await Extrato.create([{
        contaBancaria,
        tipo: 'Saída',
        valor: valorPago,
        data: new Date(),
        motivo: `Pagamento: ${conta.nome} - ${conta.fornecedor.nome}${juros ? ` (juros: R$ ${juros})` : ''}`,
        referencia: {
          tipo: 'Conta',
          id: conta._id
        },
        usuario: req.user._id
      }], { session });

      await session.commitTransaction();
      res.json(conta);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao pagar conta' });
  }
});

module.exports = router;

