import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});

export async function requestPermissions() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4F964',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export async function scheduleTaskNotification(task: Task, minutesBefore: number = 10) {
  if (Platform.OS === 'web') return;
  await cancelTaskNotification(task._id);
  
  if (task.scheduledStart && (task.status === 'pending' || task.status === 'in_progress')) {
    const startTime = new Date(task.scheduledStart);
    const triggerTime = new Date(startTime.getTime() - minutesBefore * 60000);
    const now = new Date();
    
    if (triggerTime > now) {
      const formattedTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Upcoming Task: ${task.title}`,
          body: `Starts at ${formattedTime}. Priority: ${task.priority}.`,
          data: { taskId: task._id, type: 'task_reminder' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
        identifier: `task_${task._id}`,
      });
    }
  }
}

export async function cancelTaskNotification(taskId: string) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`task_${taskId}`);
  } catch (error) {
    console.warn(`Failed to cancel reminder for task ${taskId}:`, error);
  }
}

export async function sendDisruptionNotification(rescheduled: number, deferred: number) {
  if (Platform.OS === 'web') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Schedule updated ⚡",
      body: `${rescheduled} tasks rescheduled, ${deferred} deferred.`,
      sound: true,
    },
    trigger: null,
  });
}

export async function scheduleDailyMorningBriefing() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Good Morning! ☀️",
        body: "Tap to review your schedule and prioritize your tasks for today.",
        data: { type: 'daily_briefing' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
      identifier: 'daily_morning_briefing',
    });
  } catch (error) {
    console.warn("Failed to schedule daily briefing:", error);
  }
}

export async function cancelDailyMorningBriefing() {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync('daily_morning_briefing');
  } catch (error) {
    console.warn("Failed to cancel daily briefing:", error);
  }
}

export async function syncAllTaskReminders(tasks: Task[]) {
  for (const task of tasks) {
    if (task.status === 'pending' || task.status === 'in_progress') {
      if (task.scheduledStart) {
        await scheduleTaskNotification(task);
      }
    } else {
      await cancelTaskNotification(task._id);
    }
  }
}
