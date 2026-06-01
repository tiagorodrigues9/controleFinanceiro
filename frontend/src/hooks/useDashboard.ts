// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAbortController } from './useAbortController';
import { isRequestCancelled, getRequestErrorMessage } from '../utils/requestUtils';

const useDashboard = (mes, ano) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { getSignal } = useAbortController();

  const fetchDashboardData = useCallback(async () => {
    const signal = getSignal();
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/dashboard', {
        params: { mes, ano },
        signal,
      });

      setData(response.data);
    } catch (err) {
      if (!isRequestCancelled(err)) {
        setError(getRequestErrorMessage(err, 'Erro ao carregar dados do dashboard'));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [mes, ano, getSignal]);

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
    clearError: () => setError(''),
    mesesComparacao: data?.mesesComparacao || [],
  };
};

export default useDashboard;
