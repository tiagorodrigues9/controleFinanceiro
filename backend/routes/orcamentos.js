const express = require('express');
const { body, validationResult } = require('express-validator');
const Orcamento = require('../models/Orcamento');
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();

router.use(auth);

// @route   GET /api/orcamentos/:ano/:mes
// @desc    Obter orçamento de um mês específico
// @access  Private
router.get('/:ano/:mes', async (req, res) => {
  try {
    const { ano, mes } = req.params;
    
    let orcamento = await Orcamento.findOne({
      usuario: req.user._id,
      ano: Number(ano),
      mes: Number(mes)
    }).populate('limitesPorGrupo.grupo', 'nome');

    if (!orcamento) {
      // Retornar um "mock" vazio se não existir para o frontend não quebrar
      return res.json({
        usuario: req.user._id,
        ano: Number(ano),
        mes: Number(mes),
        valorLimiteGeral: 0,
        limitesPorGrupo: []
      });
    }

    res.json(orcamento);
  } catch (error) {
    logger.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ message: 'Erro ao buscar orçamento' });
  }
});

// @route   POST /api/orcamentos/:ano/:mes
// @desc    Criar ou atualizar orçamento mensal
// @access  Private
router.post('/:ano/:mes', [
  body('valorLimiteGeral').isNumeric().withMessage('Valor geral deve ser numérico'),
  body('limitesPorGrupo').isArray().withMessage('Limites por grupo devem ser um array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { ano, mes } = req.params;
    const { valorLimiteGeral, limitesPorGrupo } = req.body;

    let orcamento = await Orcamento.findOne({
      usuario: req.user._id,
      ano: Number(ano),
      mes: Number(mes)
    });

    if (orcamento) {
      orcamento.valorLimiteGeral = valorLimiteGeral;
      orcamento.limitesPorGrupo = limitesPorGrupo;
      await orcamento.save();
    } else {
      orcamento = new Orcamento({
        usuario: req.user._id,
        ano: Number(ano),
        mes: Number(mes),
        valorLimiteGeral,
        limitesPorGrupo
      });
      await orcamento.save();
    }

    res.json(orcamento);
  } catch (error) {
    logger.error('Erro ao salvar orçamento:', error);
    res.status(500).json({ message: 'Erro ao salvar orçamento' });
  }
});

module.exports = router;
