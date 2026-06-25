import { create } from 'zustand';
import api from '../lib/api';
import { Task } from '../lib/types';
import { useScheduleStore } from './scheduleStore';

interface TaskFilters {
  date?: string;
  status?: string;
  priority?: string;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  lastFilters: TaskFilters | undefined;
  fetchTasks: (filters?: TaskFilters) => Promise<void>;
  addTask: (task: { title: string; durationMinutes: number; priority: string; deadline: string; description?: string; scheduledStart?: string; scheduledEnd?: string }) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  lastFilters: undefined,

  fetchTasks: async (filters) => {
    set({ isLoading: true, error: null, lastFilters: filters });
    try {
      const params = new URLSearchParams();
      if (filters?.date) params.append('date', filters.date);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      const query = params.toString();
      const res = await api.get(`/tasks${query ? `?${query}` : ''}`);
      set({ tasks: res.data as Task[], isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load tasks', isLoading: false });
    }
  },

  addTask: async (task) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/tasks', task);
      // Re-fetch with the same filters the list was last loaded with
      await get().fetchTasks(get().lastFilters);
      await useScheduleStore.getState().fetchToday();
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || 'Failed to add task', isLoading: false });
      throw err;
    }
  },

  updateTask: async (id, data) => {
    set({ error: null });
    try {
      await api.patch(`/tasks/${id}`, data);
      await get().fetchTasks(get().lastFilters);
      await useScheduleStore.getState().fetchToday();
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || 'Failed to update task' });
      throw err;
    }
  },

  deleteTask: async (id) => {
    set({ error: null });
    try {
      await api.delete(`/tasks/${id}`);
      await get().fetchTasks(get().lastFilters);
      await useScheduleStore.getState().fetchToday();
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || 'Failed to delete task' });
      throw err;
    }
  },

  completeTask: async (id) => {
    set({ error: null });
    try {
      await api.patch(`/tasks/${id}/complete`);
      await get().fetchTasks(get().lastFilters);
      await useScheduleStore.getState().fetchToday();
    } catch (err: any) {
      set({ error: err.response?.data?.message || err.message || 'Failed to complete task' });
      throw err;
    }
  },
}));
