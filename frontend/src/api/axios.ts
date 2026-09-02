import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:8080';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL.replace(/\/$/, ''),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const normalizedUrl = config.url?.startsWith('/') ? config.url.slice(1) : config.url;

  if (normalizedUrl) {
    config.url = normalizedUrl;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error?.response?.data;
    const message =
      (payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string' && payload.detail) ||
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string' && payload.message) ||
      (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string' && payload.error) ||
      error?.message || 'Request failed';

    return Promise.reject(new Error(message));
  },
);

export const apiClient = api;
export const apiBaseUrl = API_BASE_URL;

export async function apiRequest<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
  const response = await apiClient.request<T>({
    url,
    ...options,
  });

  return response.data;
}

export default apiClient;
