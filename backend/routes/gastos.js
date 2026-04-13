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

    // Processar valor com precisão de centavos (abordagem ultra-robusta para valores gigantescos)
    let valorProcessado;
    
    // Verificar se o valor é extremamente grande (além do limite do JavaScript)
    if (valor.includes('e') || parseFloat(valor) > Number.MAX_SAFE_INTEGER) {
      // Valor muito grande - usar manipulação de string pura
      console.log('🔍 Valor extremamente grande detectado, usando manipulação de string');
      
      // Remover caracteres não numéricos exceto ponto e vírgula
      const valorLimpo = valor.replace(/[^0-9.,]/g, '');
      
      // Substituir vírgula por ponto para padronizar
      const valorPadronizado = valorLimpo.replace(',', '.');
      
      // Separar parte inteira e decimal
      const partes = valorPadronizado.split('.');
      let parteInteira = partes[0] || '0';
      const parteDecimal = partes[1] ? partes[1].substring(0, 2) : '00';
      
      // Limitar parte inteira para evitar problemas (truncar se necessário)
      if (parteInteira.length > 15) {
        parteInteira = parteInteira.substring(0, 15);
        console.log('🔍 Parte inteira truncada para:', parteInteira);
      }
      
      // Construir valor final como string
      const valorFinalString = `${parteInteira}.${parteDecimal}`;
      valorProcessado = parseFloat(valorFinalString);
      
      console.log('🔍 Valor processado (string):', valorFinalString);
      console.log('🔍 Valor processado (número):', valorProcessado);
      
    } else {
      // Valor normal - usar abordagem padrão
      const valorOriginal = parseFloat(valor);
      
      if (Math.abs(valorOriginal) > 1000000) { // Se for maior que 1 milhão
        // Converter para string, manipular como centavos, depois voltar para número
        const valorString = valorOriginal.toFixed(2);
        const [parteInteira, parteDecimal] = valorString.split('.');
        const centavos = parseInt(parteInteira) * 100 + parseInt(parteDecimal || '00');
        valorProcessado = centavos / 100;
      } else {
        // Para valores normais, usar Math.round
        valorProcessado = Math.round(valorOriginal * 100) / 100;
      }
    }
    
    console.log('🔍 Debug - Processamento de valor:');
    console.log('  Valor recebido:', valor);
    console.log('  Valor processado final:', valorProcessado);
    console.log('  Tipo do valor processado:', typeof valorProcessado);
    
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
    
    console.log('🔍 Debug - Gasto salvo:');
    console.log('  ID:', gasto._id);
    console.log('  Valor no objeto:', gasto.valor);
    console.log('  Tipo do valor:', typeof gasto.valor);

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
        
        // Determinar o mês de referência da fatura
        const dataGasto = new Date(data);
        const mesReferencia = dataGasto.toISOString().slice(0, 7); // "YYYY-MM"

        // Buscar ou criar fatura do mês
        let fatura = await FaturaCartao.findOne({
          cartao: cartaoObj._id,
          mesReferencia: mesReferencia,
          usuario: req.user._id
        });

        if (!fatura) {
          // Criar nova fatura
          const dataVencimento = new Date(dataGasto);
          dataVencimento.setMonth(dataVencimento.getMonth() + 1); // Próximo mês
          dataVencimento.setDate(cartaoObj.diaVencimento || 10); // Dia de vencimento do cartão

          const dataFechamento = new Date(dataVencimento);
          dataFechamento.setDate(dataFechamento.getDate() - 5); // 5 dias antes do vencimento

          fatura = new FaturaCartao({
            cartao: cartaoObj._id,
            usuario: req.user._id,
            mesReferencia: mesReferencia,
            dataVencimento: dataVencimento,
            dataFechamento: dataFechamento
          });
        }

        // Adicionar despesa à fatura
        await fatura.adicionarDespesa(
          gasto._id,
          Math.round(parseFloat(valor) * 100) / 100,
          dataGasto,
          `Gasto: ${local || 'Sem local'}`
        );
      }
    }

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
          const dataGasto = new Date();
          const mesReferencia = dataGasto.toISOString().slice(0, 7); // "YYYY-MM"

          // Buscar ou criar fatura do mês
          let fatura = await FaturaCartao.findOne({
            cartao: cartaoObj._id,
            mesReferencia: mesReferencia,
            usuario: req.user._id
          });

          if (!fatura) {
            // Criar nova fatura
            const dataVencimento = new Date(dataGasto);
            dataVencimento.setMonth(dataVencimento.getMonth() + 1); // Próximo mês
            dataVencimento.setDate(cartaoObj.diaVencimento || 10); // Dia de vencimento do cartão

            const dataFechamento = new Date(dataVencimento);
            dataFechamento.setDate(dataFechamento.getDate() - 5); // 5 dias antes do vencimento

            fatura = new FaturaCartao({
              cartao: cartaoObj._id,
              usuario: req.user._id,
              mesReferencia: mesReferencia,
              dataVencimento: dataVencimento,
              dataFechamento: dataFechamento
            });
          }

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

