import { Conta, Gasto, Extrato, Cartao, ContaBancaria, FormaPagamento, Fornecedor, Grupo, Notificacao, Usuario, FaturaCartao } from './models';

// Respostas genéricas
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Respostas Específicas do Dashboard
export interface DashboardData {
  resumo: {
    totalEntradas: number;
    totalSaidas: number;
    saldoMes: number;
    saldoAtual: number;
  };
  saldosContas: Array<{
    _id: string;
    nome: string;
    saldoAtual: number;
  }>;
  contasVencidas: number;
  contasPendentes: number;
  gastosPorGrupo: Record<string, number>;
  evolucaoSaldo: Array<{
    conta: string;
    saldos: Array<{ mes: string; saldo: number }>;
  }>;
  relatorioCartoes: Array<{
    cartao: string;
    banco: string;
    totalGasto: number;
    limite: number;
    disponivel: number;
  }>;
  relatorioFormasPagamento: Array<{
    forma: string;
    total: number;
  }>;
}

// Erros
export interface ApiError {
  message: string;
  errors?: Array<{ field: string; message: string }>;
  code?: number;
}
