import { create } from 'zustand';
import { router } from 'expo-router';
import api from '../lib/api';
import { setItem, getItem, removeItem } from '../lib/storage';
import { User } from '../lib/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, pass) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password: pass });
      const { accessToken, refreshToken, userId } = res.data;

      // Store userId BEFORE calling /users/me so the refresh interceptor
      // has it available if the request triggers a 401.
      await setItem('accessToken', accessToken);
      await setItem('refreshToken', refreshToken);
      await setItem('userId', userId);

      const userRes = await api.get('/users/me');
      set({ user: userRes.data, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name, email, pass) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', { name, email, password: pass });
      const { accessToken, refreshToken, userId } = res.data;

      await setItem('accessToken', accessToken);
      await setItem('refreshToken', refreshToken);
      await setItem('userId', userId);

      const userRes = await api.get('/users/me');
      set({ user: userRes.data, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    if (useAuthStore.getState().isLoading) return;
    set({ isLoading: true });
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore — tokens are cleared locally regardless
    }
    await removeItem('accessToken');
    await removeItem('refreshToken');
    await removeItem('userId');
    set({ user: null, isAuthenticated: false, isLoading: false });
    router.replace('/auth/login');
  },

  loadUser: async () => {
    try {
      const res = await api.get('/users/me');
      set({ user: res.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
      // The refresh interceptor handles 401: it attempts token refresh then
      // calls forceLogoutHandler on failure, which clears storage and redirects.
    }
  },
}));
