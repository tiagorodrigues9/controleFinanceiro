import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const useDashboard = (mes, ano) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/dashboard', {
        params: { mes, ano },
      });
      
      setData(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      
      // Tratamento específico de erros
      if (err.response?.status === 401) {
        setError('Sessão expirada. Faça login novamente.');
      } else if (err.response?.status === 500) {
        setError('Erro interno do servidor. Tente novamente mais tarde.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        setError('Erro ao carregar dados do dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Controle Financeiro - Dashboard';
    return () => { document.title = prev; };
  }, []);

  const refetch = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const safeNum = (v) => (typeof v === 'number' ? v : Number(v) || 0);

  return {
    data,
    loading,
    error,
    refetch,
    safeNum,
    clearError: () => setError('')
  };
};

export default useDashboard;
