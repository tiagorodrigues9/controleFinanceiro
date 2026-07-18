const express = require('express');
const { body, validationResult } = require('express-validator');
const FormaPagamento = require('../models/FormaPagamento');
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { logger } = require('../utils/logger');

const router = express.Router();

router.param('id', validateObjectId);

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/formas-pagamento
// @desc    Obter todas as formas de pagamento do usuário
// @access  Private
router.get('/', async (req, res) => {
  try {
    // garante formas-padrão para o usuário se estiverem ausentes
    const defaultNames = ['Dinheiro', 'Boleto', 'Pix', 'Cartão de Crédito', 'Cartão de Débito'];

    // busca todas (ativas ou não) para checar o que já existe
    let existing = await FormaPagamento.find({ usuario: req.user._id }).sort({ nome: 1 });

    // normaliza nomes para comparação sem case
    const existingNames = new Set(existing.map(f => (f.nome || '').toLowerCase().trim()));
    const missing = defaultNames.filter(n => !existingNames.has(n.toLowerCase().trim()));

    if (missing.length > 0) {
      const toCreate = missing.map(n => ({ nome: n, usuario: req.user._id, isSystem: true }));
      await FormaPagamento.insertMany(toCreate);
      existing = await FormaPagamento.find({ usuario: req.user._id }).sort({ nome: 1 });
    }

    if (req.query.all === 'true') {
      res.json(existing);
    } else {
      res.json(existing.filter(f => f.ativo !== false));
    }
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar formas de pagamento' });
  }
});

// @route   GET /api/formas-pagamento/:id
// @desc    Obter uma forma de pagamento específica
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const forma = await FormaPagamento.findOne({ _id: req.params.id, usuario: req.user._id });

    if (!forma) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
    }

    res.json(forma);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar forma de pagamento' });
  }
});

// @route   POST /api/formas-pagamento
// @desc    Criar nova forma de pagamento
// @access  Private
router.post('/', [
  body('nome')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ max: 100 }).withMessage('Nome não pode ter mais de 100 caracteres')
    .escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome } = req.body;

    // Verificar duplicidade (comparação case-insensitive)
    const existente = await FormaPagamento.findOne({
      usuario: req.user._id,
      nome: { $regex: new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ativo: true
    });

    if (existente) {
      return res.status(409).json({ message: 'Já existe uma forma de pagamento com este nome.' });
    }

    // Verificar se existe uma inativa com o mesmo nome - reativar em vez de criar
    const inativa = await FormaPagamento.findOne({
      usuario: req.user._id,
      nome: { $regex: new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ativo: false
    });

    if (inativa) {
      inativa.ativo = true;
      inativa.nome = nome; // atualizar para o case que o usuário digitou
      await inativa.save();
      return res.status(201).json(inativa);
    }

    const forma = await FormaPagamento.create({
      nome,
      usuario: req.user._id
    });

    res.status(201).json(forma);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Já existe uma forma de pagamento com este nome.' });
    }
    logger.error(error);
    res.status(500).json({ message: 'Erro ao criar forma de pagamento' });
  }
});

// @route   PUT /api/formas-pagamento/:id
// @desc    Atualizar forma de pagamento
// @access  Private
router.put('/:id', [
  body('nome')
    .trim()
    .notEmpty().withMessage('Nome é obrigatório')
    .isLength({ max: 100 }).withMessage('Nome não pode ter mais de 100 caracteres')
    .escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nome } = req.body;

    // Verificar duplicidade com outra forma (excluindo a própria) - independente de estar ativa ou inativa
    const existente = await FormaPagamento.findOne({
      usuario: req.user._id,
      nome: { $regex: new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      _id: { $ne: req.params.id }
    });

    if (existente) {
      return res.status(409).json({ message: 'Já existe uma forma de pagamento com este nome.' });
    }

    // Buscar nome antigo para atualizar referências
    const formaAtual = await FormaPagamento.findOne({ _id: req.params.id, usuario: req.user._id });

    if (!formaAtual) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
    }

    if (formaAtual.isSystem) {
      return res.status(403).json({ message: 'Formas de pagamento padrão do sistema não podem ser renomeadas.' });
    }

    const nomeAntigo = formaAtual.nome;
    formaAtual.nome = nome;
    await formaAtual.save();

    // Cascata: atualizar nome nas Contas e Gastos que usam o nome antigo
    if (nomeAntigo !== nome) {
      await Promise.all([
        Conta.updateMany(
          { usuario: req.user._id, formaPagamento: nomeAntigo },
          { formaPagamento: nome }
        ),
        Gasto.updateMany(
          { usuario: req.user._id, formaPagamento: nomeAntigo },
          { formaPagamento: nome }
        )
      ]);
    }

    res.json(formaAtual);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Já existe uma forma de pagamento com este nome.' });
    }
    logger.error(error);
    res.status(500).json({ message: 'Erro ao atualizar forma de pagamento' });
  }
});

// @route   DELETE /api/formas-pagamento/:id
// @desc    Inativar forma de pagamento (soft delete)
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    // Verificar se existem registros usando esta forma
    const formaAtual = await FormaPagamento.findOne({ _id: req.params.id, usuario: req.user._id });

    if (!formaAtual) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
    }

    if (formaAtual.isSystem) {
      return res.status(403).json({ message: 'Formas de pagamento padrão do sistema não podem ser inativadas.' });
    }

    const [contasCount, gastosCount] = await Promise.all([
      Conta.countDocuments({ usuario: req.user._id, formaPagamento: formaAtual.nome, ativo: true }),
      Gasto.countDocuments({ usuario: req.user._id, formaPagamento: formaAtual.nome })
    ]);

    const totalReferencias = contasCount + gastosCount;

    // Permitir inativação, mas informar o impacto
    formaAtual.ativo = false;
    await formaAtual.save();

    const mensagem = totalReferencias > 0
      ? `Forma de pagamento inativada. Atenção: ${totalReferencias} registro(s) existente(s) ainda referenciam "${formaAtual.nome}" (${contasCount} conta(s), ${gastosCount} gasto(s)).`
      : 'Forma de pagamento inativada com sucesso.';

    res.json({ message: mensagem, referenciasAtivas: totalReferencias });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao inativar forma de pagamento' });
  }
});

// @route   PATCH /api/formas-pagamento/:id/reativar
// @desc    Reativar forma de pagamento inativa
// @access  Private
router.patch('/:id/reativar', async (req, res) => {
  try {
    const forma = await FormaPagamento.findOne({ _id: req.params.id, usuario: req.user._id });

    if (!forma) {
      return res.status(404).json({ message: 'Forma de pagamento não encontrada' });
    }

    if (forma.ativo) {
      return res.status(400).json({ message: 'Forma de pagamento já está ativa.' });
    }

    // Verificar se já existe outra ativa com o mesmo nome
    const ativaComMesmoNome = await FormaPagamento.findOne({
      usuario: req.user._id,
      nome: { $regex: new RegExp(`^${forma.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      _id: { $ne: forma._id },
      ativo: true
    });

    if (ativaComMesmoNome) {
      return res.status(409).json({ message: `Já existe uma forma ativa com o nome "${forma.nome}".` });
    }

    forma.ativo = true;
    await forma.save();

    res.json(forma);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao reativar forma de pagamento' });
  }
});

module.exports = router;
