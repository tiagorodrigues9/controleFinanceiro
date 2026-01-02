const express = require('express');
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const Grupo = require('../models/Grupo');
const Cartao = require('../models/Cartao');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { mes, ano } = req.query;
    const mesAtual = mes ? parseInt(mes) : new Date().getMonth() + 1;
    const anoAtual = ano ? parseInt(ano) : new Date().getFullYear();

    const startDate = new Date(anoAtual, mesAtual - 1, 1);
    const endDate = new Date(anoAtual, mesAtual, 0, 23, 59, 59);

    const totalContasPagar = await Conta.countDocuments({
      usuario: req.user._id,
      status: { $in: ['Pendente', 'Vencida'] },
      ativo: { $ne: false }
    });

    // Valor total de contas a pagar no mês
    const contasPagarMes = await Conta.find({
      usuario: req.user._id,
      ativo: { $ne: false },
      status: { $in: ['Pendente', 'Vencida'] },
      dataVencimento: { $gte: startDate, $lte: endDate }
    });
    const totalValorContasPagarMes = contasPagarMes.reduce((acc, conta) => acc + conta.valor, 0);

    // Quantidade de contas pendentes no mês
    const totalContasPendentesMes = await Conta.countDocuments({
      usuario: req.user._id,
      ativo: { $ne: false },
      status: 'Pendente',
      dataVencimento: { $gte: startDate, $lte: endDate }
    });

    const totalContasPagas = await Conta.countDocuments({
      usuario: req.user._id,
      status: 'Pago',
      ativo: { $ne: false },
      dataPagamento: { $gte: startDate, $lte: endDate }
    });

    const totalContasVencidas = await Conta.countDocuments({
      usuario: req.user._id,
      status: 'Vencida',
      ativo: { $ne: false },
      dataVencimento: { $gte: startDate, $lte: endDate }
    });

    // Quantidade total de contas registradas no mês
    const totalContasMes = await Conta.countDocuments({
      usuario: req.user._id,
      ativo: { $ne: false },
      dataVencimento: { $gte: startDate, $lte: endDate }
    });

    // Valor total de contas pagas no mês
    const contasPagas = await Conta.find({
      usuario: req.user._id,
      ativo: { $ne: false },
      status: 'Pago',
      dataPagamento: { $gte: startDate, $lte: endDate }
    });
    const totalValorContasPagas = contasPagas.reduce((acc, conta) => acc + conta.valor, 0);

    // Valor total de contas pendentes
    const contasPendentes = await Conta.find({
      usuario: req.user._id,
      ativo: { $ne: false },
      status: { $in: ['Pendente', 'Vencida'] }
    });
    const totalValorContasPendentes = contasPendentes.reduce((acc, conta) => acc + conta.valor, 0);

    // Valor total de contas vencidas (todas as vencidas do usuário)
    const contasVencidasArr = await Conta.find({
      usuario: req.user._id,
      ativo: { $ne: false },
      status: 'Vencida'
    });
    const totalValorContasVencidas = contasVencidasArr.reduce((acc, conta) => acc + conta.valor, 0);

    // Total de contas a pagar no próximo mês (quantidade e valor)
    const nextMonthStart = new Date(anoAtual, mesAtual, 1);
    const nextMonthEnd = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59);
    const contasNextMonth = await Conta.find({
      usuario: req.user._id,
      ativo: { $ne: false },
      status: { $in: ['Pendente'] },
      dataVencimento: { $gte: nextMonthStart, $lte: nextMonthEnd }
    });
    const totalContasNextMonth = contasNextMonth.length;
    const totalValorContasNextMonth = contasNextMonth.reduce((acc, conta) => acc + conta.valor, 0);

    // Gráfico de comparação de meses
    const mesesComparacao = [];
    for (let i = 0; i < 6; i++) {
      const mesRef = new Date(anoAtual, mesAtual - 1 - i, 1);
      const mesRefEnd = new Date(anoAtual, mesAtual - i, 0, 23, 59, 59);
      
      const contasMes = await Conta.find({
        usuario: req.user._id,
        status: 'Pago',
        dataPagamento: { $gte: mesRef, $lte: mesRefEnd }
      });

      const totalGasto = contasMes.reduce((acc, conta) => acc + conta.valor, 0);
      
      mesesComparacao.push({
        mes: mesRef.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }),
        total: totalGasto
      });
    }
    mesesComparacao.reverse();

    // Tipo de despesa com mais gasto
    const gastos = await Gasto.find({
      usuario: req.user._id,
      data: { $gte: startDate, $lte: endDate }
    }).populate('tipoDespesa.grupo');

    const gastosPorGrupo = {};
    gastos.forEach(gasto => {
      const grupoNome = gasto.tipoDespesa?.grupo?.nome || 'Sem grupo';
      const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100; // Precisão de centavos
      gastosPorGrupo[grupoNome] = (gastosPorGrupo[grupoNome] || 0) + valorGasto;
    });

    const tipoDespesaMaisGasto = Object.entries(gastosPorGrupo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, valor]) => ({ nome, valor }));

    // Evolução do saldo por conta bancária
    const contasBancarias = await ContaBancaria.find({ usuario: req.user._id });
    // Build monthly points for the last 6 months (including current)
    const monthsRange = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(anoAtual, mesAtual - 1 - i, 1);
      const refEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59);
      monthsRange.push(refEnd);
    }

    const evolucaoSaldo = await Promise.all(
      contasBancarias.map(async (conta) => {
        const saldos = await Promise.all(
          monthsRange.map(async (monthEnd) => {
            const extratos = await Extrato.find({
              contaBancaria: conta._id,
              usuario: req.user._id,
              estornado: false,
              data: { $lte: monthEnd }
            });

            const saldo = extratos.reduce((acc, ext) => {
              if (ext.tipo === 'Entrada' || ext.tipo === 'Saldo Inicial') return acc + ext.valor;
              return acc - ext.valor;
            }, 0);

            return {
              data: monthEnd,
              saldo
            };
          })
        );

        return {
          conta: conta.nome,
          saldos
        };
      })
    );

    // Percentual de gastos por categoria
    const grupos = await Grupo.find({ usuario: req.user._id });
    
    // Calcular total geral de gastos no período
    const totalGeral = gastos.reduce((acc, gasto) => {
      const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100; // Precisão de centavos
      return acc + valorGasto;
    }, 0);
    
    const percentualPorCategoria = await Promise.all(
      grupos.map(async (grupo) => {
        const gastosGrupo = await Gasto.find({
          usuario: req.user._id,
          'tipoDespesa.grupo': grupo._id,
          data: { $gte: startDate, $lte: endDate }
        });

        const totalGrupo = gastosGrupo.reduce((acc, gasto) => {
          const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100; // Precisão de centavos
          return acc + valorGasto;
        }, 0);
        const percentual = totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0;

        return {
          categoria: grupo.nome,
          percentual: parseFloat(percentual.toFixed(2)),
          valor: totalGrupo
        };
      })
    );

    // Relatório detalhado por tipo de despesa (grupos e subgrupos)
    const relatorioTiposDespesa = await Promise.all(
      grupos.map(async (grupo) => {
        // Buscar gastos do grupo no período
        const gastosGrupo = await Gasto.find({
          usuario: req.user._id,
          'tipoDespesa.grupo': grupo._id,
          data: { $gte: startDate, $lte: endDate }
        }).populate('tipoDespesa.grupo');

        // Agrupar por subgrupo
        const gastosPorSubgrupo = {};
        gastosGrupo.forEach(gasto => {
          const subgrupoNome = gasto.tipoDespesa.subgrupo || 'Não categorizado';
          const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100; // Precisão de centavos
          gastosPorSubgrupo[subgrupoNome] = (gastosPorSubgrupo[subgrupoNome] || 0) + valorGasto;
        });

        const totalGrupo = Object.values(gastosPorSubgrupo).reduce((acc, valor) => acc + valor, 0);

        // Criar objeto com detalhes do grupo
        const relatorioGrupo = {
          grupoId: grupo._id,
          grupoNome: grupo.nome,
          totalGrupo: totalGrupo,
          percentualGrupo: totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0,
          subgrupos: Object.entries(gastosPorSubgrupo).map(([subgrupoNome, valor]) => ({
            subgrupoNome,
            valor,
            percentualSubgrupo: totalGrupo > 0 ? (valor / totalGrupo) * 100 : 0
          })).sort((a, b) => b.valor - a.valor)
        };

        return relatorioGrupo;
      })
    );

    // Filtrar apenas grupos com gastos no período e ordenar por valor
    const relatorioTiposDespesaFiltrado = relatorioTiposDespesa
      .filter(item => item.totalGrupo > 0)
      .sort((a, b) => b.totalGrupo - a.totalGrupo);

    // Dados para gráfico de barras (top 10 grupos)
    const graficoBarrasTiposDespesa = relatorioTiposDespesaFiltrado
      .slice(0, 10)
      .map(item => ({
        nome: item.grupoNome,
        valor: item.totalGrupo,
        percentual: item.percentualGrupo
      }));

    // Dados para gráfico de pizza (top 6 grupos)
    const graficoPizzaTiposDespesa = relatorioTiposDespesaFiltrado
      .slice(0, 6)
      .map(item => ({
        categoria: item.grupoNome,
        valor: item.totalGrupo,
        percentual: item.percentualGrupo
      }));

    // Relatório de gastos por cartão
    const cartoes = await Cartao.find({ usuario: req.user._id, ativo: true });
    const relatorioCartoes = await Promise.all(
      cartoes.map(async (cartao) => {
        // Buscar gastos do cartão no período
        const gastosCartao = await Gasto.find({
          usuario: req.user._id,
          cartao: cartao._id,
          data: { $gte: startDate, $lte: endDate }
        });

        // Buscar contas pagas com cartão no período
        const contasPagasCartao = await Conta.find({
          usuario: req.user._id,
          cartao: cartao._id,
          status: 'Pago',
          dataPagamento: { $gte: startDate, $lte: endDate }
        });

        // Calcular totais
        const totalGastos = gastosCartao.reduce((acc, gasto) => {
          const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100; // Precisão de centavos
          return acc + valorGasto;
        }, 0);
        const totalContas = contasPagasCartao.reduce((acc, conta) => acc + conta.valor + (conta.jurosPago || 0), 0);
        const totalGeral = totalGastos + totalContas;
        const quantidadeTransacoes = gastosCartao.length + contasPagasCartao.length;

        return {
          cartaoId: cartao._id,
          nome: cartao.nome,
          tipo: cartao.tipo,
          banco: cartao.banco,
          limite: cartao.limite,
          totalGastos,
          totalContas,
          totalGeral,
          quantidadeTransacoes,
          quantidadeGastos: gastosCartao.length,
          quantidadeContas: contasPagasCartao.length,
          limiteUtilizado: cartao.tipo === 'Crédito' && cartao.limite > 0 ? 
            ((totalGeral / cartao.limite) * 100).toFixed(2) : 0,
          disponivel: cartao.tipo === 'Crédito' ? cartao.limite - totalGeral : null
        };
      })
    );

    // Filtrar apenas cartões com gastos no período e ordenar
    const relatorioCartoesFiltrado = relatorioCartoes
      .filter(item => item.totalGeral > 0)
      .sort((a, b) => b.totalGeral - a.totalGeral);

    // Relatório de formas de pagamento
    const gastosPorFormaPagamento = {};
    const contasPorFormaPagamento = {};

    // Processar gastos por forma de pagamento
    gastos.forEach(gasto => {
      const formaPagamento = gasto.formaPagamento || 'Não informado';
      const valorGasto = Math.round(parseFloat(gasto.valor) * 100) / 100;
      gastosPorFormaPagamento[formaPagamento] = (gastosPorFormaPagamento[formaPagamento] || 0) + valorGasto;
    });

    // Processar contas pagas por forma de pagamento
    const contasPagasFormas = await Conta.find({
      usuario: req.user._id,
      status: 'Pago',
      dataPagamento: { $gte: startDate, $lte: endDate }
    });

    contasPagasFormas.forEach(conta => {
      const formaPagamento = conta.formaPagamento || 'Não informado';
      const valorConta = Math.round(parseFloat(conta.valor) * 100) / 100 + (conta.jurosPago || 0);
      contasPorFormaPagamento[formaPagamento] = (contasPorFormaPagamento[formaPagamento] || 0) + valorConta;
    });

    // Combinar gastos e contas por forma de pagamento
    const relatorioFormasPagamento = [];
    const todasFormas = new Set([...Object.keys(gastosPorFormaPagamento), ...Object.keys(contasPorFormaPagamento)]);

    todasFormas.forEach(forma => {
      const totalGastos = gastosPorFormaPagamento[forma] || 0;
      const totalContas = contasPorFormaPagamento[forma] || 0;
      const totalGeral = totalGastos + totalContas;
      
      if (totalGeral > 0) {
        relatorioFormasPagamento.push({
          formaPagamento: forma,
          totalGastos: totalGastos,
          totalContas: totalContas,
          totalGeral: totalGeral,
          percentualGeral: totalGeral > 0 ? (totalGeral / (totalGastos + Object.values(contasPorFormaPagamento).reduce((a, b) => a + b, 0) + Object.values(gastosPorFormaPagamento).reduce((a, b) => a + b, 0))) * 100 : 0
        });
      }
    });

    // Ordenar por valor total
    relatorioFormasPagamento.sort((a, b) => b.totalGeral - a.totalGeral);

    res.json({
      totalContasPagar,
      totalValorContasPagarMes,
      totalContasPendentesMes,
      totalContasPagas,
      totalContasVencidas,
      totalValorContasVencidas,
      totalContasNextMonth,
      totalValorContasNextMonth,
      totalContasMes,
      totalValorContasPagas,
      totalValorContasPendentes,
      mesesComparacao,
      tipoDespesaMaisGasto,
      evolucaoSaldo,
      percentualPorCategoria,
      relatorioTiposDespesa: relatorioTiposDespesaFiltrado,
      graficoBarrasTiposDespesa,
      graficoPizzaTiposDespesa,
      relatorioCartoes: relatorioCartoesFiltrado,
      relatorioFormasPagamento
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;

