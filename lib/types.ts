export interface User {
  _id: string;
  id: string;
  name: string;
  email: string;
  workStartTime?: string;
  workEndTime?: string;
  notificationsEnabled?: boolean;
  timezone?: string;
  createdAt?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'complete' | 'deferred';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  deadline?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  deferredToDate?: string;
  completedAt?: string;
  isManualOverride?: boolean;
  createdAt?: string;
}

export interface AnalyticsResponse {
  dailyCompletionRate: {
    date: string;
    completed: number;
    scheduled: number;
    rate: number;
  }[];
  deferralRate: {
    date: string;
    deferred: number;
    scheduled: number;
    rate: number;
  }[];
  avgTasksPerDay: number;
  lifeHappenedEvents: {
    date: string;
    count: number;
  }[];
  summary: {
    completionPercent: number;
    insight: string;
  };
}
