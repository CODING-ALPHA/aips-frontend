import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { Task } from '../lib/types';
import { SLOT_HEIGHT } from '../lib/constants';
import { TaskBlock } from './TaskBlock';
import { router } from 'expo-router';
import { useTaskStore } from '../store/taskStore';
import { useScheduleStore } from '../store/scheduleStore';
import api from '../lib/api';

interface TimelineProps {
  tasks: Task[];
  isRecalculating?: boolean;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
const TOTAL_HEIGHT = (17 * 2 - 1) * SLOT_HEIGHT;

export function Timeline({ tasks, isRecalculating }: TimelineProps) {
  const [now, setNow] = useState(new Date());
  const { updateTask } = useTaskStore();
  const { detectConflicts, conflicts, fetchToday } = useScheduleStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(200)).current;
  const preDragTasks = useRef<Task[]>([]);
  
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeToOffset = (d: Date) => {
    const hours = d.getHours() + d.getMinutes() / 60;
    return (hours - 6) * 2 * SLOT_HEIGHT;
  };

  const currentTimeTop = timeToOffset(now);
  const showCurrentTime = now.getHours() >= 6 && now.getHours() <= 22;

  const scheduledTasks = tasks.filter(t => t.scheduledStart);

  // --- Compute Vertical Layouts ---
  const taskLayouts = new Map<string, { top: number; height: number }>();
  
  const sortedTasks = [...scheduledTasks].sort((a, b) => 
    new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime()
  );

  let currentTop = -1;

  sortedTasks.forEach((t) => {
    const naturalTop = timeToOffset(new Date(t.scheduledStart!));
    const height = (t.durationMinutes / 30) * SLOT_HEIGHT;

    // Stack them vertically if they overlap, pushing them down to be readable
    const top = Math.max(naturalTop, currentTop);
    
    taskLayouts.set(t._id, { top, height });

    currentTop = top + height + 4; // 4px gap between stacked tasks
  });


  const showUndoToast = (msg: string) => {
    setToastMessage(msg);
    Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true }).start();
    setTimeout(() => {
      hideToast();
    }, 5000);
  };

  const hideToast = () => {
    Animated.spring(toastAnim, { toValue: 200, useNativeDriver: true }).start(() => {
      setToastMessage(null);
    });
  };

  const handleUndo = async () => {
    hideToast();
    useScheduleStore.setState({ schedule: preDragTasks.current });
  };

  const checkConflict = (taskId: string, startStr: string, endStr: string) => {
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    
    return tasks.some(t => {
      if (t._id === taskId || !t.scheduledStart || !t.scheduledEnd) return false;
      const tStart = new Date(t.scheduledStart).getTime();
      const tEnd = new Date(t.scheduledEnd).getTime();
      return (start < tEnd && end > tStart);
    });
  };

  const findNextFreeSlot = (taskId: string, startStr: string, durationMinutes: number): string | null => {
    let currentStart = new Date(startStr);
    let attempts = 0;
    
    while (attempts < 40) { // try up to 40 slots (10 hours)
      const currentStartStr = currentStart.toISOString();
      const currentEndStr = new Date(currentStart.getTime() + durationMinutes * 60000).toISOString();
      
      if (!checkConflict(taskId, currentStartStr, currentEndStr)) {
        return currentStartStr;
      }
      currentStart = new Date(currentStart.getTime() + 15 * 60000); // add 15 mins
      attempts++;
    }
    return null;
  };

  const onDragEnd = async (taskId: string, newStartStr: string, isManualOverride: boolean) => {
    preDragTasks.current = [...tasks];

    // Optimistic update so the block animates to its new position immediately
    const updatedTasks = tasks.map(t => {
      if (t._id !== taskId) return t;
      return {
        ...t,
        scheduledStart: newStartStr,
        scheduledEnd: new Date(new Date(newStartStr).getTime() + t.durationMinutes * 60000).toISOString(),
        isManualOverride,
      };
    });
    useScheduleStore.setState({ schedule: updatedTasks });

    await updateTask(taskId, { scheduledStart: newStartStr, isManualOverride });

    detectConflicts();
    // Show undo toast on every successful drag
    showUndoToast(isManualOverride ? "Task moved." : "Conflict resolved — task snapped to next free slot.");
  };

  const handleAutoResolve = async () => {
    for (const task of tasks) {
      if (task.isManualOverride) {
        await updateTask(task._id, { isManualOverride: false });
      }
    }
    const today = new Date().toISOString().split('T')[0];
    try { await api.post('/schedule/recalculate', { date: today }); } catch(e) {}
    await fetchToday();
    useScheduleStore.setState({ conflicts: [] });
  };

  return (
    <View className="flex-1 bg-white relative">
      {/* Conflicts Banner */}
      {conflicts.length > 0 && (
        <View className="bg-red-50 p-3 px-4 flex-row items-center justify-between border-b border-red-100 z-40">
          <Text className="text-red-600 font-bold text-sm">
             {conflicts.length} conflict(s) detected
          </Text>
          <TouchableOpacity onPress={handleAutoResolve} className="bg-red-500 px-3 py-2 rounded-md">
             <Text className="text-white font-bold text-xs uppercase tracking-wider">Auto-Resolve</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView className="flex-1 bg-white relative" contentContainerStyle={{ height: TOTAL_HEIGHT + SLOT_HEIGHT }}>
        {/* Background Grid & Time Labels */}
        {HOURS.map((hour, index) => {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour > 12 ? hour - 12 : hour;
          const topPosition = index * 2 * SLOT_HEIGHT;
          return (
            <View key={hour} className="absolute left-0 right-0 border-t border-gray-100 flex-row" style={{ top: topPosition, height: SLOT_HEIGHT * 2 }}>
              <View className="w-[52px] items-center pt-[6px]">
                 <Text className="text-gray-400 text-[10px] font-bold tracking-widest">{displayHour} {ampm}</Text>
              </View>
              <View className="flex-1 border-l border-gray-100" />
              <View className="absolute top-[60px] left-[52px] right-0 border-t border-gray-50 border-dashed" />
            </View>
          );
        })}

        {/* Task Blocks */}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 52, right: 8 }}>
          {scheduledTasks.map(task => {
             const layout = taskLayouts.get(task._id) || { top: 0, height: 0 };
             // A task is in conflict if it appears in any detected conflict pair
             const isInConflict = conflicts.some(pair => pair.includes(task._id));
             return (
               <TaskBlock
                 key={task._id}
                 task={task}
                 computedTop={layout.top}
                 computedHeight={layout.height}
                 isInConflict={isInConflict}
                 onPress={() => router.push(`/(tabs)/tasks/${task._id}`)}
                 onDragEnd={onDragEnd}
                 checkConflict={checkConflict}
                 findNextFreeSlot={findNextFreeSlot}
               />
             );
          })}
        </View>

        {/* Current Time Indicator */}
        {showCurrentTime && (
          <View style={{ position: 'absolute', top: currentTimeTop, left: 16, right: 0, flexDirection: 'row', alignItems: 'center', zIndex: 20 }}>
             <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
             <View className="flex-1 h-[1px] bg-red-500" />
          </View>
        )}

        {/* Recalculating Overlay */}
        {isRecalculating && (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 52, right: 8, backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 30, justifyContent: 'center', alignItems: 'center' }}>
             <Animated.View className="bg-[#6C63FF] p-4 rounded-full shadow-lg flex-row items-center">
               <Text className="text-white text-lg mr-2">⚡</Text>
               <Text className="text-white font-bold tracking-widest text-xs uppercase">Recalculating Schedule</Text>
             </Animated.View>
          </View>
        )}
      </ScrollView>

      {/* Undo Toast Overlay */}
      <Animated.View 
        className="absolute bottom-6 left-6 right-6 bg-gray-900 rounded-xl flex-row items-center justify-between p-4 px-5 shadow-2xl z-50"
        style={{ transform: [{ translateY: toastAnim }] }}
      >
         <Text className="text-white flex-1 font-medium mr-4 text-xs">{toastMessage}</Text>
         <TouchableOpacity onPress={handleUndo} className="bg-white/20 px-4 py-[6px] rounded-md">
            <Text className="text-[#a5b4fc] font-bold text-xs uppercase tracking-wider">Undo</Text>
         </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
