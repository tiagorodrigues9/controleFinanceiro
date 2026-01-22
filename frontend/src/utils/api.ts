import axios, { AxiosResponse, AxiosError } from 'axios';

const api = axios.create({
  baseURL: `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api`,
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔍 Interceptor - Verificando token para URL:', config.url);
    console.log('🔍 Interceptor - Token encontrado:', token ? 'SIM' : 'NÃO');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token adicionado à requisição:', token.substring(0, 20) + '...');
    } else {
      console.log('🔍 Nenhum token encontrado no localStorage');
    }
    return config;
  },
  (error) => {
    console.error('❌ Erro no interceptor de requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.log('❌ Erro 401 - Token inválido ou expirado');
      // Só redirecionar se não estiver na página de login
      if (window.location.pathname !== '/login') {
        console.log('🔄 Redirecionando para login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

