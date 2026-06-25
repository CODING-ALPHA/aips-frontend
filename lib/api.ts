import axios, { AxiosResponse } from 'axios';
import { router } from 'expo-router';
import { API_URL } from './constants';
import { getItem, setItem, removeItem } from './storage';

// Registered by the root layout so api.ts never imports the auth store (avoids circular dep)
let forceLogoutHandler: (() => void) | null = null;
export function registerForceLogout(handler: () => void) {
  forceLogoutHandler = handler;
}

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {}
  return config;
});

// Refresh token queue to prevent concurrent refresh races
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function performLogout() {
  await removeItem('accessToken');
  await removeItem('refreshToken');
  await removeItem('userId');
  if (forceLogoutHandler) {
    forceLogoutHandler();
  } else {
    setTimeout(() => {
      try {
        router.replace('/auth/login');
      } catch (e) {}
    }, 100);
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      // Already retried after a refresh — the new token was also rejected,
      // meaning the session is truly invalid. Force logout immediately.
      if (originalRequest._retry) {
        await performLogout();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        // Another refresh is in progress — wait for it
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const userId = await getItem('userId');
        const refreshToken = await getItem('refreshToken');

        if (!userId || !refreshToken) throw new Error('No refresh info');

        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, {
          userId,
          refreshToken,
        });

        await setItem('accessToken', data.accessToken);
        if (data.refreshToken) {
          await setItem('refreshToken', data.refreshToken);
        }

        isRefreshing = false;
        onRefreshed(data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        await performLogout();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export const apiClient = {
  get: <T>(url: string, config?: any): Promise<AxiosResponse<T>> => api.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => api.post<T>(url, data, config),
  patch: <T>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => api.patch<T>(url, data, config),
  delete: <T>(url: string, config?: any): Promise<AxiosResponse<T>> => api.delete<T>(url, config),
};

export default api;
