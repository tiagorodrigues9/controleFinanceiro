const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const auth = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { logger } = require('../utils/logger');

const router = express.Router();

router.param('id', validateObjectId);

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/extrato
// @desc    Obter extrato
// @access  Private
router.get('/', async (req, res) => {
  try {
    logger.debug('=== EXTRATO DEBUG ===');
    logger.debug('req.user._id:', req.user._id);
    logger.debug('req.query:', req.query);
    
    const { contaBancaria, tipoDespesa, cartao, dataInicio, dataFim } = req.query;
    const query = { usuario: req.user._id, estornado: false };

    if (contaBancaria) {
      query.contaBancaria = new mongoose.Types.ObjectId(contaBancaria);
    }

    if (cartao) {
      query.cartao = new mongoose.Types.ObjectId(cartao);
    }

    if (dataInicio && dataFim) {
      // Criar datas considerando o fuso horário local
      const [inicioYear, inicioMonth, inicioDay] = dataInicio.split('-').map(Number);
      const [fimYear, fimMonth, fimDay] = dataFim.split('-').map(Number);

      query.data = {
        $gte: new Date(inicioYear, inicioMonth - 1, inicioDay, 0, 0, 0),
        $lte: new Date(fimYear, fimMonth - 1, fimDay, 23, 59, 59, 999)
      };
    }

    logger.debug('Query para extratos:', query);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const totalsAgg = await Extrato.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEntradas: {
            $sum: {
              $cond: [
                { $in: ['$tipo', ['Entrada', 'Saldo Inicial']] },
                '$valor',
                0
              ]
            }
          },
          totalSaidas: {
            $sum: {
              $cond: [{ $eq: ['$tipo', 'Saída'] }, '$valor', 0]
            }
          }
        }
      }
    ]);
    const totalEntradas = totalsAgg[0]?.totalEntradas || 0;
    const totalSaidas = totalsAgg[0]?.totalSaidas || 0;

    // Otimização: mover filtro de tipoDespesa para MongoDB usando aggregation
    let extratos;
    let total = 0;
    
    if (tipoDespesa) {
      // Usar aggregation para filtro de tipoDespesa no banco
      extratos = await Extrato.aggregate([
        { $match: query },
        { 
          $lookup: {
            from: 'gastos',
            localField: 'referencia.id',
            foreignField: '_id',
            as: 'gastoRef',
            pipeline: [
              {
                $match: {
                  'tipoDespesa.grupo': new mongoose.Types.ObjectId(tipoDespesa)
                }
              }
            ]
          }
        },
        { 
          $lookup: {
            from: 'contas',
            localField: 'referencia.id',
            foreignField: '_id',
            as: 'contaRef',
            pipeline: [
              {
                $match: {
                  'tipoControle': new mongoose.Types.ObjectId(tipoDespesa)
                }
              }
            ]
          }
        },
        {
          $match: {
            $or: [
              { 'gastoRef.0': { $exists: true } },
              { 'contaRef.0': { $exists: true } }
            ]
          }
        },
        {
          $lookup: {
            from: 'contabancarias',
            localField: 'contaBancaria',
            foreignField: '_id',
            as: 'contaBancaria'
          }
        },
        { $unwind: { path: '$contaBancaria', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'cartoes',
            localField: 'cartao',
            foreignField: '_id',
            as: 'cartao'
          }
        },
        { $unwind: { path: '$cartao', preserveNullAndEmptyArrays: true } },
        { $sort: { data: -1 } },
        {
          $facet: {
            items: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }]
          }
        }
      ]);

      const facetResult = extratos[0] || { items: [], totalCount: [] };
      extratos = (facetResult.items || []).map(extrato => {
        const { gastoRef, contaRef, ...rest } = extrato;
        return rest;
      });
      total = facetResult.totalCount[0]?.count || 0;
    } else {
      const [list, count] = await Promise.all([
        Extrato.find(query)
          .populate('contaBancaria', 'nome banco')
          .populate('cartao', 'nome banco tipo')
          .sort({ data: -1 })
          .skip(skip)
          .limit(limit),
        Extrato.countDocuments(query)
      ]);
      extratos = list;
      total = count;
    }

    logger.debug('Extratos encontrados:', extratos.length, 'total:', total);

    let totalSaldo = 0;
    
    // Calcular saldo da conta (se houver filtro de conta bancária)
    if (contaBancaria) {
      const saldoAgg = await Extrato.aggregate([
        { 
          $match: { 
            contaBancaria: new mongoose.Types.ObjectId(contaBancaria), 
            usuario: new mongoose.Types.ObjectId(req.user._id), 
            estornado: false 
          } 
        },
        { 
          $group: { 
            _id: null, 
            total: { 
              $sum: { 
                $cond: { 
                  if: { $in: ['$tipo', ['Entrada','Saldo Inicial']] }, 
                  then: '$valor', 
                  else: { $multiply: ['$valor', -1] } 
                } 
              } 
            } 
          } 
        }
      ]);
      totalSaldo = saldoAgg[0]?.total || 0;
    }

    const totalPages = Math.ceil(total / limit) || 1;

    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Total-Pages', totalPages);

    res.json({
      extratos,
      total,
      page,
      limit,
      totalPages,
      totalSaldo,
      totalEntradas,
      totalSaidas,
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao buscar extrato' });
  }
});

// @route   POST /api/extrato
// @desc    Criar lançamento manual
// @access  Private
router.post('/', [
  body('contaBancaria').notEmpty().withMessage('Conta bancária é obrigatória'),
  body('tipo').isIn(['Entrada', 'Saída']).withMessage('Tipo deve ser Entrada ou Saída'),
  body('valor').isFloat({ min: 0 }).withMessage('Valor deve ser maior ou igual a zero'),
  body('data').notEmpty().withMessage('Data é obrigatória'),
  body('motivo').notEmpty().withMessage('Motivo é obrigatório')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contaBancaria, tipo, valor, data, motivo, cartao } = req.body;

    // Criar data em UTC para evitar problemas de timezone
    const [year, month, day] = data.split('-').map(Number);
    const dataParsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Verificar se conta bancária pertence ao usuário e está ativa
    const conta = await ContaBancaria.findOne({
      _id: contaBancaria,
      usuario: req.user._id,
      ativo: { $ne: false }
    });

    if (!conta) {
      return res.status(400).json({ message: 'Conta bancária inválida ou inativa' });
    }

    const extrato = await Extrato.create({
      contaBancaria,
      cartao: cartao || null,
      tipo,
      valor: parseFloat(valor),
      data: dataParsed,
      motivo,
      referencia: {
        tipo: 'Lancamento',
        id: null
      },
      usuario: req.user._id
    });

    await extrato.populate('contaBancaria', 'nome banco');
    if (extrato.cartao) {
      await extrato.populate('cartao', 'nome banco tipo');
    }

    res.status(201).json(extrato);
  } catch (error) {
    logger.error(error);
    res.status(500).json({ message: 'Erro ao criar lançamento' });
  }
});

// @route   POST /api/extrato/:id/estornar
// @desc    Estornar lançamento
// @access  Private
router.post('/:id/estornar', async (req, res) => {
  try {
    // Validar se o ID é um ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de lançamento inválido' });
    }

    const extrato = await Extrato.findOne({
      _id: req.params.id,
      usuario: req.user._id
    });

    if (!extrato) {
      return res.status(404).json({ message: 'Lançamento não encontrado' });
    }

    if (extrato.estornado) {
      return res.status(400).json({ message: 'Lançamento já foi estornado' });
    }

    // TRAVA DE SEGURANÇA (Opção B)
    if (extrato.referencia?.tipo === 'FaturaCartao') {
      return res.status(400).json({ 
        message: 'Estorno bloqueado. Pagamentos de fatura devem ser estornados diretamente na tela de Cartões.' 
      });
    }

    extrato.estornado = true;
    await extrato.save();

    // Se o extrato tiver referência a um gasto, excluir o gasto também
    if (extrato.referencia?.tipo === 'Gasto' && extrato.referencia?.id) {
      try {
        const Gasto = require('../models/Gasto');
        const gasto = await Gasto.findOne({
          _id: extrato.referencia.id,
          usuario: req.user._id
        });

        if (gasto) {
          await gasto.deleteOne();
        }
      } catch (gastoError) {
        logger.error('Erro ao excluir gasto correspondente:', gastoError);
      }
    } else if (extrato.referencia?.tipo === 'Conta' && extrato.referencia?.id) {
      // Se for pagamento de conta, voltar o status da conta para Pendente
      try {
        const Conta = require('../models/Conta');
        const conta = await Conta.findOne({
          _id: extrato.referencia.id,
          usuario: req.user._id
        });

        if (conta) {
          conta.status = 'Pendente';
          conta.dataPagamento = null;
          await conta.save();
        }
      } catch (contaError) {
        logger.error('Erro ao reverter status da conta:', contaError);
      }
    }

    res.json({ message: 'Lançamento estornado com sucesso' });
  } catch (error) {
    logger.error('Erro ao estornar lançamento:', error);
    res.status(500).json({ message: 'Erro ao estornar lançamento' });
  }
});

module.exports = router;

