interface User {
  id: string;
  nome: string;
  email: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  configuracoes?: {
    notificacoes: {
      ativo: boolean;
      contasVencidas: boolean;
      contasProximas: boolean;
      limiteCartao: boolean;
      diasAntecedencia: number;
    };
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (nome: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updateUser: (userData: User) => void;
}

export type { User, AuthContextType };
