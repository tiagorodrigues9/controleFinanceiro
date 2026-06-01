import { useCallback, useEffect, useRef } from 'react';

/**
 * Retorna um signal atualizado a cada "geração" e aborta a anterior no próximo getSignal ou no unmount.
 */
export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  const getSignal = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  useEffect(() => () => {
    controllerRef.current?.abort();
  }, []);

  return { getSignal, abort };
}
