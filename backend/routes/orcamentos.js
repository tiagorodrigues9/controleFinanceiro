const express = require('express');
const { body, validationResult } = require('express-validator');
const Orcamento = require('../models/Orcamento');
const Gasto = require('../models/Gasto');
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');
const validateObjectId = require('../middleware/validateObjectId');

const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: Orçamentos
 *   description: Gerenciamento de orçamentos mensais
 */
router.use(auth);

// @route   GET /api/orcamentos:ano/:mes
// @desc    Obter orçamento de um mês específico
// @access  Private
/**
 * @swagger
 * /api/orcamentos/{ano}/{mes}:
 *   get:
 *     summary: Obter orçamento do mês
 *     tags: [Orçamentos]
 *     parameters:
 *       - in: path
 *         name: ano
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mes
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
router.get('/:ano/:mes', async (req, res) => {
  try {
    const { ano, mes } = req.params;
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes);

    if (isNaN(anoNum) || isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ message: 'Parâmetros de ano ou mês inválidos' });
    }

    const startDate = new Date(anoNum, mesNum - 1, 1);
    const endDate = new Date(anoNum, mesNum, 0, 23, 59, 59);

    // 1. Buscar Orçamento Definido
    let orcamento = await Orcamento.findOne({
      usuario: req.user._id,
      ano: anoNum,
      mes: mesNum
    }).populate('limitesPorGrupo.grupo', 'nome');

    // 2. Buscar e Agregar Gastos Reais do Mês
    const gastosMes = await Gasto.aggregate([
      {
        $match: {
          usuario: req.user._id,
          data: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            grupo: "$tipoDespesa.grupo",
            subgrupo: "$tipoDespesa.subgrupo"
          },
          totalGasto: { $sum: "$valor" }
        }
      }
    ]);

    // 3. Montar Mapa Rápido O(1) de Gastos (Grupos e Subgrupos)
    const gastosMap = {};
    const subgastosMap = {};
    let gastoRealGeral = 0;
    
    gastosMes.forEach(g => {
      const val = g.totalGasto || 0;
      gastoRealGeral += val;
      
      const grupoId = g._id.grupo?.toString();
      const subnome = g._id.subgrupo;
      
      if (grupoId) {
        gastosMap[grupoId] = (gastosMap[grupoId] || 0) + val;
        if (subnome) {
          subgastosMap[`${grupoId}_${subnome}`] = val;
        }
      }
    });

    if (!orcamento) {
      // Retornar um "mock" vazio mas com o Gasto Geral Computado
      return res.json({
        usuario: req.user._id,
        ano: anoNum,
        mes: mesNum,
        valorLimiteGeral: 0,
        gastoRealGeral,
        limitesPorGrupo: []
      });
    }

    // 4. Injetar o Gasto Real em cada Limite Definido
    const limitesEnriquecidos = orcamento.limitesPorGrupo.map(item => {
      const grupoId = item.grupo?._id?.toString();
      const gastoDaCategoria = grupoId ? (gastosMap[grupoId] || 0) : 0;
      
      const subgruposEnriquecidos = (item.subgrupos || []).map(sub => ({
        _id: sub._id,
        nome: sub.nome,
        valorLimite: sub.valorLimite,
        gastoReal: grupoId ? (subgastosMap[`${grupoId}_${sub.nome}`] || 0) : 0
      }));

      return {
        _id: item._id,
        grupo: item.grupo,
        valorLimite: item.valorLimite,
        gastoReal: gastoDaCategoria,
        subgrupos: subgruposEnriquecidos
      };
    });

    res.json({
      _id: orcamento._id,
      usuario: orcamento.usuario,
      ano: orcamento.ano,
      mes: orcamento.mes,
      valorLimiteGeral: orcamento.valorLimiteGeral,
      gastoRealGeral,
      limitesPorGrupo: limitesEnriquecidos,
      createdAt: orcamento.createdAt,
      updatedAt: orcamento.updatedAt
    });

  } catch (error) {
    logger.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ message: 'Erro ao buscar orçamento' });
  }
});

// @route   POST /api/orcamentos:ano/:mes
// @desc    Criar ou atualizar orçamento mensal
// @access  Private
/**
 * @swagger
 * /api/orcamentos/{ano}/{mes}:
 *   post:
 *     summary: Criar ou atualizar orçamento do mês
 *     tags: [Orçamentos]
 *     parameters:
 *       - in: path
 *         name: ano
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: mes
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valorLimiteGeral:
 *                 type: number
 *               limitesPorGrupo:
 *                 type: array
 *     responses:
 *       201:
 *         description: Criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
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
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes);
    if (isNaN(anoNum) || isNaN(mesNum) || mesNum < 1 || mesNum > 12) {
      return res.status(400).json({ message: 'Parâmetros de ano ou mês inválidos' });
    }

    const { valorLimiteGeral, limitesPorGrupo } = req.body;

    let orcamento = await Orcamento.findOne({
      usuario: req.user._id,
      ano: anoNum,
      mes: mesNum
    });

    if (orcamento) {
      orcamento.valorLimiteGeral = valorLimiteGeral;
      orcamento.limitesPorGrupo = limitesPorGrupo;
      await orcamento.save();
    } else {
      orcamento = new Orcamento({
        usuario: req.user._id,
        ano: anoNum,
        mes: mesNum,
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
