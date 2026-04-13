const express = require('express');
const FaturaCartao = require('../models/FaturaCartao');
const Cartao = require('../models/Cartao');
const auth = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(auth);

// @route   GET /api/dashboard-faturas/resumo
// @desc    Obter resumo de faturas para dashboard
// @access  Private
router.get('/resumo', async (req, res) => {
  try {
    const usuarioId = req.user._id;
    
    // Data atual para cálculos
    const hoje = new Date();
    const mesAtual = hoje.toISOString().slice(0, 7); // "YYYY-MM"
    const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
      .toISOString().slice(0, 7);
    const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
      .toISOString().slice(0, 7);

    // Buscar faturas dos últimos 3 meses
    const faturas = await FaturaCartao.find({
      usuario: usuarioId,
      mesReferencia: { $in: [mesAnterior, mesAtual, proximoMes] }
    }).populate('cartao');

    // Calcular totais
    const resumo = {
      totalAberto: 0,
      totalFechado: 0,
      totalPago: 0,
      faturasAbertas: [],
      faturasVencendo: [],
      faturasVencidas: [],
      cartoes: []
    };

    // Agrupar por cartão
    const cartoesMap = new Map();

    faturas.forEach(fatura => {
      const cartaoNome = fatura.cartao ? `${fatura.cartao.nome} - ${fatura.cartao.banco}` : 'Cartão não identificado';
      
      // Inicializar dados do cartão se não existir
      if (!cartoesMap.has(cartaoNome)) {
        cartoesMap.set(cartaoNome, {
          nome: cartaoNome,
          cartaoId: fatura.cartao?._id,
          totalAberto: 0,
          totalFechado: 0,
          totalPago: 0,
          faturas: []
        });
      }

      const cartaoData = cartoesMap.get(cartaoNome);

      // Adicionar fatura ao cartão
      cartaoData.faturas.push({
        _id: fatura._id,
        mesReferencia: fatura.mesReferencia,
        status: fatura.status,
        valorTotal: fatura.valorTotal,
        dataVencimento: fatura.dataVencimento,
        dataFechamento: fatura.dataFechamento,
        dataPagamento: fatura.dataPagamento,
        despesasCount: fatura.despesas.length
      });

      // Atualizar totais do cartão
      if (fatura.status === 'Aberta') {
        cartaoData.totalAberto += fatura.valorTotal;
        resumo.totalAberto += fatura.valorTotal;
        resumo.faturasAbertas.push(fatura);
        
        // Verificar se vence nos próximos 7 dias
        const diasParaVencimento = Math.ceil((fatura.dataVencimento - hoje) / (1000 * 60 * 60 * 24));
        if (diasParaVencimento <= 7 && diasParaVencimento >= 0) {
          resumo.faturasVencendo.push({
            ...fatura.toObject(),
            diasParaVencimento
          });
        }
        
        // Verificar se já venceu
        if (diasParaVencimento < 0) {
          resumo.faturasVencidas.push(fatura);
        }
      } else if (fatura.status === 'Fechada') {
        cartaoData.totalFechado += fatura.valorTotal;
        resumo.totalFechado += fatura.valorTotal;
      } else if (fatura.status === 'Paga') {
        cartaoData.totalPago += fatura.valorTotal;
        resumo.totalPago += fatura.valorTotal;
      }
    });

    resumo.cartoes = Array.from(cartoesMap.values());

    // Estatísticas adicionais
    resumo.estatisticas = {
      totalFaturas: faturas.length,
      faturasPagas: faturas.filter(f => f.status === 'Paga').length,
      faturasAbertas: faturas.filter(f => f.status === 'Aberta').length,
      faturasFechadas: faturas.filter(f => f.status === 'Fechada').length,
      valorMedioFatura: faturas.length > 0 ? faturas.reduce((sum, f) => sum + f.valorTotal, 0) / faturas.length : 0,
      proximosVencimentos: resumo.faturasVencendo.sort((a, b) => a.dataVencimento - b.dataVencimento).slice(0, 3)
    };

    logger.info('Resumo de faturas gerado', { 
      userId: usuarioId,
      totalAberto: resumo.totalAberto,
      totalFechado: resumo.totalFechado,
      totalPago: resumo.totalPago
    });

    res.json(resumo);
  } catch (error) {
    logger.error('Erro ao gerar resumo de faturas', { error: error.message, userId: req.user._id });
    res.status(500).json({ message: 'Erro ao gerar resumo de faturas' });
  }
});

// @route   GET /api/dashboard-faturas/tendencias
// @desc    Obter tendências de gastos com cartão nos últimos 6 meses
// @access  Private
router.get('/tendencias', async (req, res) => {
  try {
    const usuarioId = req.user._id;
    
    // Calcular últimos 6 meses
    const meses = [];
    const hoje = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push(data.toISOString().slice(0, 7));
    }

    // Buscar faturas dos últimos 6 meses
    const faturas = await FaturaCartao.find({
      usuario: usuarioId,
      mesReferencia: { $in: meses }
    }).populate('cartao');

    // Agrupar dados por mês
    const tendencias = meses.map(mes => {
      const faturasDoMes = faturas.filter(f => f.mesReferencia === mes);
      
      const totalMes = faturasDoMes.reduce((sum, f) => sum + f.valorTotal, 0);
      const pagasMes = faturasDoMes.filter(f => f.status === 'Paga').reduce((sum, f) => sum + f.valorTotal, 0);
      const abertasMes = faturasDoMes.filter(f => f.status === 'Aberta').reduce((sum, f) => sum + f.valorTotal, 0);
      
      // Agrupar por cartão
      const porCartao = {};
      faturasDoMes.forEach(fatura => {
        const cartaoNome = fatura.cartao ? `${fatura.cartao.nome} - ${fatura.cartao.banco}` : 'Outros';
        if (!porCartao[cartaoNome]) {
          porCartao[cartaoNome] = 0;
        }
        porCartao[cartaoNome] += fatura.valorTotal;
      });

      return {
        mes,
        total: totalMes,
        pagas: pagasMes,
        abertas: abertasMes,
        quantidadeFaturas: faturasDoMes.length,
        porCartao
      };
    });

    res.json(tendencias);
  } catch (error) {
    logger.error('Erro ao gerar tendências de faturas', { error: error.message, userId: req.user._id });
    res.status(500).json({ message: 'Erro ao gerar tendências de faturas' });
  }
});

module.exports = router;
