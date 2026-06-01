// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAbortController } from './useAbortController';
import { isRequestCancelled, getRequestErrorMessage } from '../utils/requestUtils';

export const useApi = (url, initialData = null, dependencies = []) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { getSignal } = useAbortController();

  const fetchData = useCallback(async () => {
    const signal = getSignal();
    try {
      setLoading(true);
      setError('');
      const response = await api.get(url, { signal });
      setData(response.data);
    } catch (err) {
      if (!isRequestCancelled(err)) {
        setError(getRequestErrorMessage(err, 'Erro ao carregar dados'));
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [url, getSignal]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
};
