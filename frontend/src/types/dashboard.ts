interface DashboardData {
  totalContasPagar: number;
  totalValorContasPagarMes: number;
  totalContasPendentesMes: number;
  totalContasPagas: number;
  totalValorContasPagas: number;
  totalContasVencidas: number;
  totalValorContasVencidas: number;
  totalContasNextMonth: number;
  totalValorContasNextMonth: number;
  totalContasMes: number;
  totalValorContasPendentes: number;
  mesesComparacao: Array<{
    mes: string;
    contas: number;
    gastos: number;
    total: number;
  }>;
  tipoDespesaMaisGasto: Array<{
    nome: string;
    valor: number;
  }>;
  evolucaoSaldo: Array<{
    conta: string;
    saldos: Array<{
      data: Date;
      saldo: number;
    }>;
  }>;
  percentualPorCategoria: Array<{
    categoria: string;
    percentual: number;
    valor: number;
  }>;
  relatorioTiposDespesa: Array<{
    grupoId: string;
    grupoNome: string;
    totalGrupo: number;
    percentualGrupo: number;
    subgrupos: Array<{
      subgrupoNome: string;
      valor: number;
      percentualSubgrupo: number;
    }>;
  }>;
  graficoBarrasTiposDespesa: Array<{
    nome: string;
    valor: number;
    percentual: number;
  }>;
  graficoPizzaTiposDespesa: Array<{
    categoria: string;
    valor: number;
    percentual: number;
  }>;
  relatorioCartoes: Array<{
    cartaoId: string;
    nome: string;
    tipo: string;
    banco: string;
    limite: number;
    totalGastos: number;
    totalContas: number;
    totalGeral: number;
    quantidadeTransacoes: number;
    quantidadeGastos: number;
    quantidadeContas: number;
    limiteUtilizado: string;
    disponivel: number | null;
  }>;
  relatorioFormasPagamento: Array<{
    formaPagamento: string;
    totalGastos: number;
    totalContas: number;
    totalGeral: number;
    percentualGeral: number;
  }>;
}

export type { DashboardData };
