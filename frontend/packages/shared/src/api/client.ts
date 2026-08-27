import axios, { type AxiosInstance } from 'axios';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
});

type TokenProvider = () => Promise<string | null>;

let tokenProvider: TokenProvider | null = null;

/** Register async token getter (from @palliroute/auth) to avoid circular imports. */
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

api.interceptors.request.use(async (config) => {
  if (tokenProvider) {
    const token = await tokenProvider();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && tokenProvider) {
      // Let the UI/auth layer handle re-login; clear stale header context
      console.warn('API returned 401 — authentication required');
    }
    return Promise.reject(error);
  }
);

export default api;
