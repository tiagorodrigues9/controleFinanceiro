export interface Usuario {
  _id: string;
  nome: string;
  email: string;
  configuracoes?: {
    notificacoes: {
      ativo: boolean;
      tipos: string[];
    };
  };
}

export interface Conta {
  _id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  fornecedor?: string | Fornecedor;
  contaBancaria?: string | ContaBancaria;
  formaPagamento?: string;
  status: 'Pendente' | 'Pago' | 'Vencida';
  ativo: boolean;
  parcelaAtual?: number;
  totalParcelas?: number;
  parcelaId?: string;
  usuario: string;
}

export interface Gasto {
  _id: string;
  tipoDespesa: {
    grupo?: string | Grupo;
    subgrupo?: string;
  };
  valor: number;
  data: string;
  local?: string;
  observacao?: string;
  formaPagamento?: string;
  contaBancaria?: string | ContaBancaria;
  cartao?: string | Cartao;
  usuario: string;
}

export interface Extrato {
  _id: string;
  contaBancaria: string | ContaBancaria;
  tipo: 'Entrada' | 'Saída';
  valor: number;
  data: string;
  motivo: string;
  referencia?: {
    tipo: 'Gasto' | 'Conta' | 'Transferência';
    id: string;
  };
  estornado?: boolean;
  usuario: string;
}

export interface Cartao {
  _id: string;
  nome: string;
  banco: string;
  limite: number;
  diaVencimento: number;
  diaFechamento: number;
  ativo: boolean;
  usuario: string;
}

export interface FaturaCartao {
  _id: string;
  cartao: string | Cartao;
  usuario: string;
  mesReferencia: string;
  dataVencimento: string;
  dataFechamento: string;
  valorTotal: number;
  status: 'Aberta' | 'Fechada' | 'Paga';
  despesas: Array<{
    gastoId: string;
    valor: number;
    data: string;
    descricao: string;
  }>;
}

export interface ContaBancaria {
  _id: string;
  nome: string;
  tipo: 'Corrente' | 'Poupança' | 'Investimento';
  banco: string;
  saldoInicial: number;
  saldoAtual?: number;
  ativo: boolean;
  usuario: string;
}

export interface Fornecedor {
  _id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  usuario: string;
}

export interface Grupo {
  _id: string;
  nome: string;
  subgrupos: Array<{
    _id: string;
    nome: string;
  }>;
  usuario: string;
}

export interface FormaPagamento {
  _id: string;
  nome: string;
  ativo: boolean;
  usuario: string;
}

export interface Notificacao {
  _id: string;
  titulo: string;
  mensagem: string;
  tipo: 'Alerta' | 'Info' | 'Aviso';
  lida: boolean;
  dataCriacao: string;
  urlReferencia?: string;
  usuario: string;
}
