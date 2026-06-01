import axios, { AxiosError } from 'axios';

export const REQUEST_TIMEOUT_MS = 30000;

export function isRequestCancelled(error: unknown): boolean {
  return axios.isCancel(error);
}

export function getRequestErrorMessage(error: unknown, fallback: string): string {
  if (isRequestCancelled(error)) {
    return '';
  }
  const axiosError = error as AxiosError;
  if (axiosError.code === 'ECONNABORTED') {
    return 'A requisição expirou. Tente novamente.';
  }
  if (axiosError.response?.status === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }
  return fallback;
}

export function parsePaginationHeaders(headers: Record<string, unknown> | undefined) {
  const total = Number(headers?.['x-total-count'] ?? headers?.['X-Total-Count'] ?? 0);
  const totalPages = Number(headers?.['x-total-pages'] ?? headers?.['X-Total-Pages'] ?? 0);
  return { total, totalPages };
}
