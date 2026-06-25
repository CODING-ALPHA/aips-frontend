import { create } from 'zustand';
import { getItem, setItem } from '../lib/storage';

export type CalendarViewType = 'Schedule' | 'Day' | '3-Day' | 'Week' | 'Month';

interface UIState {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  calendarViewMode: CalendarViewType;
  setCalendarViewMode: (mode: CalendarViewType) => void;

  // Notification Settings (persisted)
  remindersEnabled: boolean;
  setRemindersEnabled: (enabled: boolean) => void;
  dailyBriefingEnabled: boolean;
  setDailyBriefingEnabled: (enabled: boolean) => void;
  loadPersistedPrefs: () => Promise<void>;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: false,
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  calendarViewMode: 'Schedule',
  setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),

  remindersEnabled: true,
  setRemindersEnabled: (enabled) => {
    set({ remindersEnabled: enabled });
    setItem('pref_remindersEnabled', String(enabled));
  },
  dailyBriefingEnabled: true,
  setDailyBriefingEnabled: (enabled) => {
    set({ dailyBriefingEnabled: enabled });
    setItem('pref_dailyBriefingEnabled', String(enabled));
  },

  loadPersistedPrefs: async () => {
    try {
      const reminders = await getItem('pref_remindersEnabled');
      const briefing = await getItem('pref_dailyBriefingEnabled');
      set({
        remindersEnabled: reminders !== null ? reminders === 'true' : true,
        dailyBriefingEnabled: briefing !== null ? briefing === 'true' : true,
      });
    } catch {
      // Use defaults on error
    }
  },
}));
