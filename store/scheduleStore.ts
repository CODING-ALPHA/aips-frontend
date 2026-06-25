import { create } from 'zustand';
import api from '../lib/api';
import { Task } from '../lib/types';
import { sendDisruptionNotification, syncAllTaskReminders } from '../lib/notifications';

interface ScheduleState {
  schedule: Task[];
  conflicts: string[][];
  isRecalculating: boolean;
  lastError: string | null;
  fetchToday: () => Promise<void>;
  disrupt: () => Promise<{ tasksRescheduled: number; tasksDeferred: number }>;
  detectConflicts: () => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedule: [],
  conflicts: [],
  isRecalculating: false,
  lastError: null,

  fetchToday: async () => {
    set({ isRecalculating: true, lastError: null });
    try {
      const res = await api.get('/schedule/today');
      set({ schedule: res.data as Task[], isRecalculating: false });
      syncAllTaskReminders(res.data as Task[]);
    } catch (err: any) {
      set({
        isRecalculating: false,
        lastError: err.response?.data?.message || err.message || 'Failed to load schedule',
      });
    }
  },

  disrupt: async () => {
    set({ isRecalculating: true, lastError: null });
    try {
      const res = await api.post('/schedule/disrupt');
      const data = res.data as any;
      const updatedTasks = data.updatedTasks || [];
      set({ schedule: updatedTasks, isRecalculating: false });
      sendDisruptionNotification(data.tasksRescheduled || 0, data.tasksDeferred || 0);
      syncAllTaskReminders(updatedTasks);
      return {
        tasksRescheduled: data.tasksRescheduled || 0,
        tasksDeferred: data.tasksDeferred || 0,
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Disruption failed';
      set({ isRecalculating: false, lastError: errorMsg });
      // Throw so the caller knows it failed — don't silently return zeros
      throw new Error(errorMsg);
    }
  },

  detectConflicts: () => {
    const { schedule } = get();
    const tasks = schedule.filter(t => t.scheduledStart && t.scheduledEnd);

    const sorted = [...tasks].sort((a, b) =>
      new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime()
    );

    const conflicts: string[][] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentTask = sorted[i];
      const nextTask = sorted[i + 1];

      const currentEnd = new Date(currentTask.scheduledEnd!).getTime();
      const nextStart = new Date(nextTask.scheduledStart!).getTime();

      if (currentEnd > nextStart) {
        conflicts.push([currentTask._id, nextTask._id]);
      }
    }
    set({ conflicts });
  },
}));
