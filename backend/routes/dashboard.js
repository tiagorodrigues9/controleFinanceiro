const express = require('express');
const Conta = require('../models/Conta');
const Gasto = require('../models/Gasto');
const Extrato = require('../models/Extrato');
const ContaBancaria = require('../models/ContaBancaria');
const Grupo = require('../models/Grupo');
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
      status: { $in: ['Pendente', 'Vencida'] }
    });

    const totalContasPagas = await Conta.countDocuments({
      usuario: req.user._id,
      status: 'Pago',
      dataPagamento: { $gte: startDate, $lte: endDate }
    });

    const totalContasVencidas = await Conta.countDocuments({
      usuario: req.user._id,
      status: 'Vencida',
      dataVencimento: { $gte: startDate, $lte: endDate }
    });

    // Quantidade total de contas registradas no mês
    const totalContasMes = await Conta.countDocuments({
      usuario: req.user._id,
      dataVencimento: { $gte: startDate, $lte: endDate }
    });

    // Valor total de contas pagas no mês
    const contasPagas = await Conta.find({
      usuario: req.user._id,
      status: 'Pago',
      dataPagamento: { $gte: startDate, $lte: endDate }
    });
    const totalValorContasPagas = contasPagas.reduce((acc, conta) => acc + conta.valor, 0);

    // Valor total de contas pendentes
    const contasPendentes = await Conta.find({
      usuario: req.user._id,
      status: { $in: ['Pendente', 'Vencida'] }
    });
    const totalValorContasPendentes = contasPendentes.reduce((acc, conta) => acc + conta.valor, 0);

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
      gastosPorGrupo[grupoNome] = (gastosPorGrupo[grupoNome] || 0) + gasto.valor;
    });

    const tipoDespesaMaisGasto = Object.entries(gastosPorGrupo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, valor]) => ({ nome, valor }));

    // Evolução do saldo por conta bancária
    const contasBancarias = await ContaBancaria.find({ usuario: req.user._id });
    const evolucaoSaldo = await Promise.all(
      contasBancarias.map(async (conta) => {
        const extratos = await Extrato.find({
          contaBancaria: conta._id,
          usuario: req.user._id,
          estornado: false,
          data: { $lte: endDate }
        }).sort({ data: 1 });

        const saldos = [];
        let saldoAtual = 0;
        extratos.forEach(extrato => {
          if (extrato.tipo === 'Entrada' || extrato.tipo === 'Saldo Inicial') {
            saldoAtual += extrato.valor;
          } else {
            saldoAtual -= extrato.valor;
          }
          saldos.push({
            data: extrato.data,
            saldo: saldoAtual
          });
        });

        return {
          conta: conta.nome,
          saldos
        };
      })
    );

    // Percentual de gastos por categoria
    const grupos = await Grupo.find({ usuario: req.user._id });
    const percentualPorCategoria = await Promise.all(
      grupos.map(async (grupo) => {
        const gastosGrupo = await Gasto.find({
          usuario: req.user._id,
          'tipoDespesa.grupo': grupo._id,
          data: { $gte: startDate, $lte: endDate }
        });

        const totalGrupo = gastosGrupo.reduce((acc, gasto) => acc + gasto.valor, 0);
        const totalGeral = gastos.reduce((acc, gasto) => acc + gasto.valor, 0);
        const percentual = totalGeral > 0 ? (totalGrupo / totalGeral) * 100 : 0;

        return {
          categoria: grupo.nome,
          percentual: parseFloat(percentual.toFixed(2)),
          valor: totalGrupo
        };
      })
    );

    res.json({
      totalContasPagar,
      totalContasPagas,
      totalContasVencidas,
      totalContasMes,
      totalValorContasPagas,
      totalValorContasPendentes,
      mesesComparacao,
      tipoDespesaMaisGasto,
      evolucaoSaldo,
      percentualPorCategoria
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;

