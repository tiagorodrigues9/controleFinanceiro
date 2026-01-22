import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import api from '../utils/api';
import { User, AuthContextType } from '../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Começa como true para verificar token
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se já existe usuário logado ao carregar a página
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('🔍 Debug AuthContext - Token no localStorage:', token ? 'SIM' : 'NÃO');
    console.log('🔍 Debug AuthContext - User data no localStorage:', userData ? 'SIM' : 'NÃO');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        console.log('✅ Usuário restaurado do localStorage:', parsedUser.email);
      } catch (error) {
        console.error('❌ Erro ao carregar usuário do localStorage:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('🔍 Nenhum token encontrado, usuário não está logado');
    }
    
    // Finaliza verificação inicial
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      setError(null);
      
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      console.log('🔑 Login - Token recebido:', token ? 'SIM' : 'NÃO');
      console.log('👤 Login - User recebido:', user.email);

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Verificar se foi salvo corretamente
      const tokenSalvo = localStorage.getItem('token');
      const userSalvo = localStorage.getItem('user');
      console.log('💾 Login - Token salvo no localStorage:', tokenSalvo ? 'SIM' : 'NÃO');
      console.log('💾 Login - User salvo no localStorage:', userSalvo ? 'SIM' : 'NÃO');

      setUser(user);

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao fazer login';
      setError(errorMessage);
      
      return {
        success: false,
        message: errorMessage,
      };
    }
    // Removido setLoading - não usa mais loading do contexto
  };

  const register = async (nome: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.post('/auth/register', { nome, email, password });
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao registrar',
      };
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao enviar email',
      };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await api.post('/auth/reset-password', { token, password });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Erro ao redefinir senha',
      };
    }
  };

  const updateUser = (userData: User): void => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setError,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

