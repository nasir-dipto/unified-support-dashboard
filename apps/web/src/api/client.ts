import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store';

const baseURL =
  import.meta.env.VITE_API_URL !== undefined &&
  import.meta.env.VITE_API_URL.length > 0
    ? import.meta.env.VITE_API_URL
    : 'http://localhost:3001';

export const apiClient = axios.create({ baseURL });

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token !== null && token.length > 0) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original: InternalAxiosRequestConfig | undefined = error.config;
    if (status !== 401 || original === undefined || original._retry === true) {
      return await Promise.reject(error);
    }
    original._retry = true;
    const refresh = useAuthStore.getState().refreshToken;
    if (refresh === null || refresh.length === 0) {
      useAuthStore.getState().clear();
      return await Promise.reject(error);
    }
    try {
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${baseURL}/api/auth/refresh`, { refreshToken: refresh });
      useAuthStore.getState().updateTokens(data.accessToken, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return await apiClient(original);
    } catch (e: unknown) {
      useAuthStore.getState().clear();
      const err =
        e instanceof Error ? e : new Error('Session refresh failed', { cause: e });
      return await Promise.reject(err);
    }
  },
);
