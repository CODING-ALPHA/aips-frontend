import { create } from 'zustand';
import api from '../lib/api';
import { AnalyticsResponse } from '../lib/types';

interface AnalyticsState {
  data: AnalyticsResponse | null;
  period: "7d" | "30d";
  isLoading: boolean;
  fetch: (period: "7d" | "30d") => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  data: null,
  period: "7d",
  isLoading: false,

  fetch: async (period) => {
    set({ isLoading: true, period });
    try {
      const res = await api.get(`/analytics?period=${period}`);
      set({ data: res.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  }
}));
