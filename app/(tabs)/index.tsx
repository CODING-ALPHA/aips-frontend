import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  Modal, TouchableWithoutFeedback, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { useUIStore } from '../../store/uiStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIORITY_COLORS } from '../../lib/constants';

const priorityColors: Record<string, string> = {
  high:   `bg-[#FFF0ED]`,
  medium: `bg-[#FFF7ED]`,
  low:    `bg-[#F0FAED]`,
};

const priorityDotColors = {
  high:   PRIORITY_COLORS.high.solid,
  medium: PRIORITY_COLORS.medium.solid,
  low:    PRIORITY_COLORS.low.solid,
};

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12 AM – 11 PM
const formatHour = (h: number) => {
  if (h === 0)  return '12 AM';
  if (h < 12)   return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
};


export default function Home() {
  const [showTaskModal, setShowTaskModal]       = useState(false);
  const [selectedEvent, setSelectedEvent]       = useState<any>(null);
  const [showDisruptModal, setShowDisruptModal] = useState(false);

  const [disruptLoading, setDisruptLoading]     = useState(false);
  const [disruptResult, setDisruptResult]       = useState<{ tasksRescheduled: number; tasksDeferred: number } | null>(null);

  const [activePriorities, setActivePriorities] = useState<string[]>(['high', 'medium', 'low']);
  const [activeStatuses, setActiveStatuses]     = useState<string[]>(['pending', 'complete', 'in_progress', 'deferred']);
  const [viewDate, setViewDate]                 = useState(new Date());
  const [calendarMonth, setCalendarMonth]       = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [showMonthBar, setShowMonthBar]           = useState(false);
  const [showViewModeDropdown, setShowViewModeDropdown] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { tasks, fetchTasks, completeTask, deleteTask } = useTaskStore();
  const { user }                                        = useAuthStore();
  const { schedule, fetchToday, disrupt, isRecalculating } = useScheduleStore();
  const { toggleSidebar, calendarViewMode: viewMode, setCalendarViewMode: setViewMode } = useUIStore();

  const timeGridRef = useRef<ScrollView>(null);

  const scrollToCurrentTime = () => {
    if (viewMode === 'Day' || viewMode === '3-Day' || viewMode === 'Week') {
      const now = new Date();
      const nowHour = now.getHours() + now.getMinutes() / 60;
      let targetY = (nowHour - 1) * 100;
      if (targetY < 0) targetY = 0;
      
      // Try scrolling immediately
      timeGridRef.current?.scrollTo({ y: targetY, animated: false });
      
      // Retry multiple times to ensure scroll occurs after layout is complete on web/mobile
      setTimeout(() => {
        timeGridRef.current?.scrollTo({ y: targetY, animated: false });
      }, 50);
      setTimeout(() => {
        timeGridRef.current?.scrollTo({ y: targetY, animated: false });
      }, 150);
      setTimeout(() => {
        timeGridRef.current?.scrollTo({ y: targetY, animated: false });
      }, 350);
    }
  };

  useEffect(() => {
    scrollToCurrentTime();
  }, [viewMode, viewDate]);

  useEffect(() => {
    fetchTasks();
    fetchToday();
  }, []);

  // Live clock for the current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic window from viewDate — maps each view mode to the correct column count
  const numDays =
    viewMode === 'Day'   ? 1 :
    viewMode === '3-Day' ? 3 :
    viewMode === 'Week'  ? 7 :
    viewMode === 'Month' ? 1 :   // Month uses its own grid renderer, numDays unused
    /* Schedule */        1;      // Schedule uses list renderer, numDays unused

  const weekDays: Date[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const startOfView = new Date(viewDate);
  startOfView.setHours(0, 0, 0, 0);

  const events = (schedule || [])
    .filter(t => t.scheduledStart)
    .filter(t => activePriorities.includes(t.priority))
    .filter(t => activeStatuses.includes(t.status))
    .map(t => {
      const d        = new Date(t.scheduledStart!);
      const dDate    = new Date(d);
      dDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dDate.getTime() - startOfView.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays >= numDays) return null;

      const durationMins = t.durationMinutes || 60;
      const startHour    = d.getHours() + d.getMinutes() / 60;
      const endD         = new Date(t.scheduledEnd || d.getTime() + durationMins * 60000);

      return {
        id: t._id,
        task: t,
        day: diffDays,
        title: t.title,
        time: `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${endD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        start: startHour,
        duration: durationMins / 60,
        color: priorityColors[t.priority] || 'bg-[#eeebfd]',
      };
    })
    .filter(Boolean) as any[];

  const moveDate = (days: number) => {
    const d = new Date(viewDate);
    if (viewMode === 'Month') {
      d.setMonth(d.getMonth() + (days > 0 ? 1 : -1));
    } else {
      d.setDate(d.getDate() + days);
    }
    setViewDate(d);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setShowTaskModal(true);
  };

  const handleCompleteTask = async () => {
    if (!selectedEvent) return;
    await completeTask(selectedEvent.id);
    await fetchToday();
    setShowTaskModal(false);
  };

  const handleDeleteTask = async () => {
    if (!selectedEvent) return;
    await deleteTask(selectedEvent.id);
    await fetchToday();
    setShowTaskModal(false);
  };

  const handleDisrupt = async () => {
    setDisruptLoading(true);
    setDisruptResult(null);
    try {
      const result = await disrupt();
      setDisruptResult(result);
      await fetchTasks();
    } catch (err: any) {
      // Error is surfaced via scheduleStore.lastError
    } finally {
      setDisruptLoading(false);
    }
  };

  const userAvatar = user?.name
    ? `https://ui-avatars.com/api/?name=${user.name.split(' ').join('+')}&background=6C63FF&color=fff`
    : 'https://ui-avatars.com/api/?name=User';

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1 w-full bg-white lg:bg-[#F8F5F1]"
      contentContainerClassName="flex-col xl:flex-row gap-4 pt-0 pb-0 lg:p-6 items-stretch"
      contentContainerStyle={{ flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <View 
        style={windowHeight > 800 && windowWidth > 600 ? { height: windowHeight * 0.97 } : undefined} 
        className="hidden xl:flex w-[280px] flex-col gap-4 shrink-0"
      >

        {/* Mini Calendar */}
        <View 
          style={{ backdropFilter: 'blur(16px)' } as any}
          className="bg-white/60 rounded-[24px] py-5 px-4 shadow-sm border border-white/40"
        >
          {/* Month navigation header */}
          <View className="flex-row items-center justify-between mb-4">
            <TouchableOpacity
              onPress={() => {
                const prev = new Date(calendarMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCalendarMonth(prev);
              }}
              className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center"
            >
              <Feather name="chevron-left" size={14} color="#374151" />
            </TouchableOpacity>
            <Text className="text-black font-semibold text-sm">
              {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const next = new Date(calendarMonth);
                next.setMonth(next.getMonth() + 1);
                setCalendarMonth(next);
              }}
              className="w-7 h-7 rounded-full bg-gray-100 items-center justify-center"
            >
              <Feather name="chevron-right" size={14} color="#374151" />
            </TouchableOpacity>
          </View>
          {/* Day-of-week labels */}
          <View className="flex-row flex-wrap mb-2">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <View key={i} className="w-[14.28%] items-center">
                <Text className="font-medium text-gray-400 text-[10px]">{d}</Text>
              </View>
            ))}
          </View>
          {/* Day grid */}
          <View className="flex-row flex-wrap">
            {(() => {
              const year  = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];
              for (let i = 0; i < firstDay; i++) {
                cells.push(<View key={`e-${i}`} className="w-[14.28%]" />);
              }
              for (let d = 1; d <= daysInMonth; d++) {
                const isSelected =
                  d === viewDate.getDate() &&
                  month === viewDate.getMonth() &&
                  year === viewDate.getFullYear();
                const isToday =
                  d === new Date().getDate() &&
                  month === new Date().getMonth() &&
                  year === new Date().getFullYear();
                cells.push(
                  <TouchableOpacity
                    key={d}
                    onPress={() => { const next = new Date(year, month, d); setViewDate(next); }}
                    className="w-[14.28%] items-center justify-center py-0.5"
                  >
                    {isSelected
                      ? <View className="bg-[#d4f964] w-6 h-6 rounded-full items-center justify-center">
                          <Text className="text-black font-bold text-[11px]">{d}</Text>
                        </View>
                      : isToday
                      ? <View className="border border-gray-300 w-6 h-6 rounded-full items-center justify-center">
                          <Text className="text-black font-semibold text-[11px]">{d}</Text>
                        </View>
                      : <Text className="text-gray-500 text-[11px]">{d}</Text>
                    }
                  </TouchableOpacity>
                );
              }
              return cells;
            })()}
          </View>
        </View>

        {/* Reschedule My Day */}
        <View 
          style={{ backdropFilter: 'blur(16px)' } as any}
          className="bg-white/60 rounded-[24px] py-5 px-4 shadow-sm border border-white/40"
        >
          {/* LIFE HAPPENED BUTTON */}
          <TouchableOpacity
            onPress={() => { setDisruptResult(null); setShowDisruptModal(true); }}
            className="flex-row items-center gap-3 bg-[#ff6b6b] rounded-2xl px-4 py-3"
            activeOpacity={0.85}
          >
            <Feather name="zap" size={16} color="white" />
            <Text className="text-white font-bold text-sm flex-1">Reschedule My Day</Text>
            <Feather name="chevron-right" size={14} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN CALENDAR AREA ───────────────────────── */}
      <View 
        style={windowWidth > 1024 ? { height: Math.max(windowHeight * 0.97, 800) } : { minHeight: windowHeight - 50 }} 
        className="flex-1 lg:bg-white rounded-none lg:rounded-[24px] overflow-hidden flex-col shadow-none lg:shadow-sm border-0 lg:border border-gray-100"
      >

        <LinearGradient
          colors={['#d9f972','#e8fcc2','#c7e3ff']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          className="pt-2"
          style={{ paddingTop: Math.max(insets.top, 8), zIndex: 9999, elevation: 9999 }}
        >
          {/* Main Header Row */}
          <View className="flex-row items-center justify-between h-14 px-4 relative z-[9999]" style={{ zIndex: 9999 }}>
            <View className="flex-row items-center gap-6">
              <TouchableOpacity onPress={toggleSidebar} className="p-1">
                <Feather name="menu" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowMonthBar(!showMonthBar)}
                className="flex-row items-center gap-0.5"
                activeOpacity={0.7}
              >
                <Text className="text-xl font-medium text-black">
                  {viewDate.toLocaleString('default', { month: 'long' })}
                </Text>
                <MaterialIcons 
                  name={showMonthBar ? "arrow-drop-up" : "arrow-drop-down"} 
                  size={24} 
                  color="black" 
                  style={{ marginBottom: -2 }}
                />
              </TouchableOpacity>
            </View>
            
            <View className="flex-row items-center gap-3 relative z-[9999]" style={{ zIndex: 9999 }}>
              <TouchableOpacity className="p-1">
                <Feather name="search" size={22} color="black" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowViewModeDropdown(!showViewModeDropdown)} 
                className="flex-row items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm"
              >
                <Text className="text-black font-semibold text-sm">{viewMode}</Text>
                <MaterialIcons name={showViewModeDropdown ? "arrow-drop-up" : "arrow-drop-down"} size={20} color="black" style={{ marginBottom: -2 }} />
              </TouchableOpacity>
              
              {/* Dropdown Menu */}
              {showViewModeDropdown && (
                <View 
                  style={{ 
                    position: 'absolute',
                    top: 48,
                    right: 40,
                    width: 160,
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#f0f0f0',
                    zIndex: 99999,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    overflow: 'hidden'
                  }}
                >
                  {['Schedule', 'Day', '3-Day', 'Week', 'Month'].map((mode, idx, arr) => (
                    <TouchableOpacity
                      key={mode}
                      onPress={() => {
                        setViewMode(mode as any);
                        setShowViewModeDropdown(false);
                      }}
                      style={{ 
                        paddingHorizontal: 16, 
                        paddingVertical: 12, 
                        backgroundColor: '#ffffff',
                        borderBottomWidth: idx !== arr.length - 1 ? 1 : 0,
                        borderBottomColor: '#f5f5f5'
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: viewMode === mode ? '700' : '500',
                          color: viewMode === mode ? '#000000' : '#4b5563'
                        }}>
                          {mode}
                        </Text>
                        {viewMode === mode && <Feather name="check" size={14} color="black" />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

            </View>
          </View>

          {/* Month Shortcut Bar */}
          {/* Filter Panel (Months, Priorities, Statuses) */}
          {showMonthBar && (
            <View className="px-4 py-3 bg-white/20 rounded-b-2xl border-t border-white/30">
              <Text className="text-xs font-bold text-black/60 mb-2 uppercase tracking-wider">Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {(() => {
                  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const currentMonthIdx = new Date().getMonth();
                  const rotatedMonths = [...allMonths.slice(currentMonthIdx), ...allMonths.slice(0, currentMonthIdx)];
                  
                  return rotatedMonths.map((m) => {
                    const monthIdx = allMonths.indexOf(m);
                    const isCurrent = monthIdx === viewDate.getMonth();
                    return (
                      <TouchableOpacity 
                        key={m} 
                        onPress={() => {
                          const newDate = new Date(viewDate);
                          newDate.setMonth(monthIdx);
                          setViewDate(newDate);
                        }}
                        className={`px-5 py-2 rounded-xl mr-3 border ${isCurrent ? 'bg-black border-black shadow-sm' : 'bg-white/30 border-white/40'}`}
                      >
                        <Text className={`text-sm font-semibold ${isCurrent ? 'text-[#d4f964]' : 'text-black'}`}>{m}</Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
                <View className="w-4" />
              </ScrollView>

              <Text className="text-xs font-bold text-black/60 mb-2 uppercase tracking-wider">Priority</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {['high', 'medium', 'low'].map(p => {
                  const isActive = activePriorities.includes(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        setActivePriorities(prev => isActive ? prev.filter(x => x !== p) : [...prev, p]);
                      }}
                      className={`px-4 py-1.5 rounded-xl mr-2 border ${isActive ? 'bg-black border-black' : 'bg-white/40 border-white/50'}`}
                    >
                      <Text className={`text-sm font-semibold capitalize ${isActive ? 'text-[#d4f964]' : 'text-black'}`}>{p}</Text>
                    </TouchableOpacity>
                  )
                })}
                <View className="w-4" />
              </ScrollView>

              <Text className="text-xs font-bold text-black/60 mb-2 uppercase tracking-wider">Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                {['pending', 'in_progress', 'complete', 'deferred'].map(s => {
                  const isActive = activeStatuses.includes(s);
                  const label = s.replace('_', ' ');
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => {
                        setActiveStatuses(prev => isActive ? prev.filter(x => x !== s) : [...prev, s]);
                      }}
                      className={`px-4 py-1.5 rounded-xl mr-2 border ${isActive ? 'bg-black border-black' : 'bg-white/40 border-white/50'}`}
                    >
                      <Text className={`text-sm font-semibold capitalize ${isActive ? 'text-[#d4f964]' : 'text-black'}`}>{label}</Text>
                    </TouchableOpacity>
                  )
                })}
                <View className="w-4" />
              </ScrollView>
            </View>
          )}
        </LinearGradient>



          {/* Day headers — shown for time-grid views only */}
          {(viewMode === 'Day' || viewMode === '3-Day' || viewMode === 'Week') && (
            <View className="flex-row gap-2 h-20 items-end">
              <View className="w-[32px] md:w-[50px] h-full justify-end pb-4 items-center">
                <Text className="font-medium text-gray-500 text-[10px]" style={{ transform: [{ rotate: '-90deg' }] }}>GMT</Text>
              </View>
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <View key={i} className={`flex-1 rounded-2xl items-center justify-center h-16 ${isToday ? 'bg-[#d4f964]/80' : 'bg-white/40'}`}>
                    <Text className="text-gray-600 text-xs">{d.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase()}</Text>
                    <Text className="text-2xl font-bold text-black">{d.getDate()}</Text>
                  </View>
                );
              })}
            </View>
          )}


        {/* ── SCHEDULE LIST VIEW ─────────────────────── */}
        {viewMode === 'Schedule' ? (
          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {(() => {
              // Group upcoming events by date, starting from today
              const upcoming = (schedule || [])
                .filter((t: any) => t.scheduledStart)
                .sort((a: any, b: any) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());

              if (upcoming.length === 0) {
                return (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Feather name="calendar" size={28} color="#9ca3af" />
                    </View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 4 }}>No upcoming events</Text>
                    <Text style={{ fontSize: 13, color: '#9ca3af' }}>Add tasks to see them here.</Text>
                    <TouchableOpacity
                      onPress={() => router.push('/(tabs)/tasks/add')}
                      style={{ marginTop: 20, backgroundColor: 'black', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 }}
                    >
                      <Feather name="plus" size={16} color="#d4f964" />
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>Add Task</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              // Group by date string
              const groups: Record<string, typeof upcoming> = {};
              upcoming.forEach((t: any) => {
                const key = new Date(t.scheduledStart).toDateString();
                if (!groups[key]) groups[key] = [];
                groups[key].push(t);
              });

              return Object.entries(groups).map(([dateStr, items]) => {
                const date = new Date(dateStr);
                const isToday = date.toDateString() === new Date().toDateString();
                const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();
                const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

                return (
                  <View key={dateStr}>
                    {/* Date header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: isToday ? '#d4f964' : '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#111' }}>{date.getDate()}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>{dayLabel}</Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af', fontWeight: '500' }}>
                          {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    {/* Event cards */}
                    <View style={{ paddingHorizontal: 16, gap: 8 }}>
                      {(items as any[]).map((ev: any) => {
                        const start = new Date(ev.scheduledStart);
                        const end = new Date(ev.scheduledEnd || start.getTime() + (ev.durationMinutes || 60) * 60000);
                        const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        const dotColor = priorityDotColors[ev.priority as keyof typeof priorityDotColors] || '#9ca3af';
                        const bgColor = priorityColors[ev.priority as keyof typeof priorityColors] || 'bg-gray-50';
                        return (
                          <TouchableOpacity
                            key={ev._id}
                            onPress={() => handleEventClick({ id: ev._id, task: ev, title: ev.title, time: timeStr, start: start.getHours() + start.getMinutes()/60, duration: (ev.durationMinutes || 60)/60, color: bgColor, day: 0 })}
                            activeOpacity={0.8}
                            style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 2 }}
                          >
                            <View className={bgColor} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderRadius: 18 }}>
                              <View style={{ width: 4, height: '100%', minHeight: 40, borderRadius: 4, backgroundColor: dotColor }} />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111', marginBottom: 3 }} numberOfLines={2}>{ev.title}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Feather name="clock" size={11} color="#9ca3af" />
                                  <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>{timeStr}</Text>
                                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>· {ev.durationMinutes || 60}m</Text>
                                </View>
                              </View>
                              <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              });
            })()}
          </ScrollView>

        ) : viewMode === 'Month' ? (
          <View className="flex-1 flex-col pt-4">
            <View className="flex-row pb-2">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <View key={i} className="flex-1 items-center">
                  <Text className="text-gray-500 font-medium text-xs">{d}</Text>
                </View>
              ))}
            </View>
            <View className="flex-1 border-t border-gray-100">
              {(() => {
                const year = viewDate.getFullYear();
                const month = viewDate.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const numRows = Math.ceil((firstDay + daysInMonth) / 7);
                
                const rows = [];
                for (let r = 0; r < numRows; r++) {
                  const rowCells = [];
                  for (let c = 0; c < 7; c++) {
                    const i = r * 7 + c;
                    const cellDate = new Date(year, month, 1 - firstDay + i);
                    const d = cellDate.getDate();
                    const m = cellDate.getMonth();
                    const y = cellDate.getFullYear();
                    
                    const isCurrentMonth = m === month;
                    const isToday = d === new Date().getDate() && m === new Date().getMonth() && y === new Date().getFullYear();
                    
                    const dayEvents = (schedule || []).filter((t: any) => {
                       if (!t.scheduledStart) return false;
                       const td = new Date(t.scheduledStart);
                       return td.getDate() === d && td.getMonth() === m && td.getFullYear() === y;
                    });
                    
                    let label = d.toString();
                    if (d === 1) {
                       label = cellDate.toLocaleString('default', { month: 'short' }) + ' ' + d;
                    }

                    rowCells.push(
                      <TouchableOpacity 
                        key={`cell-${i}`} 
                        className={`flex-1 border-b border-r border-gray-100 p-1 ${isToday ? 'bg-[#d4f964]/10' : (!isCurrentMonth ? 'bg-gray-50/30' : '')}`}
                        onPress={() => { setViewDate(cellDate); setViewMode('Day'); }}
                      >
                        <Text className={`text-center text-[10px] sm:text-xs mb-0.5 ${isToday ? 'font-bold text-black' : (isCurrentMonth ? 'text-gray-600' : 'text-gray-300')}`}>{label}</Text>
                        <View className="flex-col gap-0.5">
                          {dayEvents.slice(0, 3).map((ev: any) => (
                            <View key={ev._id} className={`px-1 py-0.5 rounded ${priorityColors[ev.priority] || 'bg-gray-100'}`}>
                               <Text className="text-[8px] sm:text-[10px] text-black" numberOfLines={1}>{ev.title}</Text>
                            </View>
                          ))}
                          {dayEvents.length > 3 && (
                            <Text className="text-[8px] text-gray-400">+{dayEvents.length - 3}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }
                  rows.push(
                    <View key={`row-${r}`} className="flex-1 flex-row">
                      {rowCells}
                    </View>
                  );
                }
                return rows;
              })()}
            </View>
          </View>
        ) : (
          /* Day / 3-Day / Week — scrollable time grid */
          <ScrollView 
            ref={timeGridRef} 
            className="flex-1 pl-1 md:pl-4 pr-2" 
            contentContainerStyle={{ paddingBottom: 32 }}
            onLayout={scrollToCurrentTime}
          >
            <View className="flex-row h-[2400px] relative mt-4">

              {/* Time labels */}
              <View className="w-[32px] md:w-[50px] flex-col z-10">
                {HOURS.map(hour => (
                  <View key={hour} className="h-[100px] relative">
                    <Text className="absolute -top-2.5 right-1 md:right-2 text-gray-500 font-medium text-[10px] md:text-xs">
                      {formatHour(hour)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Grid lines + events */}
              <View className="flex-1 relative">
                {HOURS.map((_, i) => (
                  <View key={i} className="h-[100px] border-t border-gray-100 w-full" />
                ))}
                <View className="absolute inset-0 flex-row">
                  {weekDays.map((day, dayIndex) => (
                    <View key={dayIndex} className={`flex-1 relative h-full border-l border-gray-100 ${dayIndex === numDays - 1 ? 'border-r' : ''}`}>
                      {events.filter(e => e.day === dayIndex).map(event => (
                        <TouchableOpacity
                          key={event.id}
                          className={`absolute w-[90%] left-[5%] rounded-2xl p-3 shadow-sm border border-black/5 ${event.color}`}
                          style={{ 
                            top: event.start * 100 + 2, 
                            height: Math.max(event.duration * 100 - 4, 36),
                            elevation: 2
                          }}
                          onPress={() => handleEventClick(event)}
                          activeOpacity={0.8}
                        >
                          <Text className="font-semibold text-[12px] text-black" numberOfLines={2}>{event.title}</Text>
                          {event.duration * 100 >= 55 && (
                            <Text className="text-[10px] text-black/50 mt-0.5">{event.time}</Text>
                          )}
                        </TouchableOpacity>
                      ))}

                      {/* Current time indicator */}
                      {day.toDateString() === currentTime.toDateString() && (() => {
                        const nowHour = currentTime.getHours() + currentTime.getMinutes() / 60;
                        const topPos = nowHour * 100;
                        return (
                          <View style={{ position: 'absolute', top: topPos, left: 0, right: 0, zIndex: 999, elevation: 999, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginLeft: -5 }} />
                            <View style={{ flex: 1, height: 2, backgroundColor: '#ef4444' }} />
                          </View>
                        );
                      })()}
                    </View>
                  ))}
                </View>
              </View>

            </View>
          </ScrollView>
        )}
      </View>

      {/* ── TASK DETAIL MODAL ────────────────────────── */}
      <Modal
        visible={showTaskModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTaskModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTaskModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ backgroundColor: 'white', borderRadius: 28, padding: 24, width: '100%', maxWidth: 360 }}>

                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111', flex: 1, paddingRight: 12 }} numberOfLines={3}>
                    {selectedEvent?.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowTaskModal(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Feather name="x" size={16} color="#374151" />
                  </TouchableOpacity>
                </View>

                {/* Badges */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f3f4f6', borderRadius: 20 }}>
                    <Text style={{ color: '#4b5563', fontSize: 12, fontWeight: '500', textTransform: 'capitalize' }}>
                      {selectedEvent?.task.status?.replace('_', ' ')}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: PRIORITY_COLORS[selectedEvent?.task.priority as keyof typeof PRIORITY_COLORS]?.soft || '#f3f4f6', borderRadius: 20 }}>
                    <Text style={{ color: PRIORITY_COLORS[selectedEvent?.task.priority as keyof typeof PRIORITY_COLORS]?.solid || '#374151', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>
                      {selectedEvent?.task.priority} priority
                    </Text>
                  </View>
                </View>

                {/* Time */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Feather name="calendar" size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>
                    {selectedEvent?.task.scheduledStart
                      ? new Date(selectedEvent.task.scheduledStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      : '—'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Feather name="clock" size={14} color="#9ca3af" />
                  <Text style={{ fontSize: 13, color: '#6b7280' }}>{selectedEvent?.time}</Text>
                  <Text style={{ fontSize: 11, color: '#9ca3af' }}>({selectedEvent?.task.durationMinutes} min)</Text>
                </View>

                {/* Description */}
                {selectedEvent?.task.description && (
                  <View style={{ padding: 12, backgroundColor: '#f9fafb', borderRadius: 16, marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, color: '#4b5563', lineHeight: 20 }}>{selectedEvent.task.description}</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={handleCompleteTask}
                    style={{ flex: 1, backgroundColor: '#d4f964', borderRadius: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Feather name="check" size={15} color="black" />
                    <Text style={{ color: 'black', fontWeight: '700', fontSize: 14 }}>Complete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeleteTask}
                    style={{ width: 48, backgroundColor: '#fef2f2', borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Feather name="trash-2" size={15} color="#ef4444" />
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── LIFE HAPPENED MODAL ──────────────────────── */}
      <Modal
        visible={showDisruptModal}
        transparent
        animationType="slide"
        onRequestClose={() => !disruptLoading && setShowDisruptModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => !disruptLoading && setShowDisruptModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 }}>

                {/* Handle bar */}
                <View style={{ width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#ff6b6b', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="zap" size={20} color="white" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#111' }}>Reschedule My Day</Text>
                    <Text style={{ fontSize: 13, color: '#6b7280' }}>We'll automatically recalculate your day from now.</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
                  Your unfinished tasks will be intelligently rescheduled based on the time that has passed.
                </Text>

                {/* Result feedback */}
                {disruptResult && (
                  <View style={{ backgroundColor: '#fff7ed', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                    <Feather name="refresh-cw" size={16} color="#f97316" style={{ marginTop: 2 }} />
                    <View>
                      <Text style={{ color: '#c2410c', fontWeight: '600', fontSize: 14 }}>Schedule updated</Text>
                      <Text style={{ color: '#ea580c', fontSize: 12, marginTop: 2 }}>
                        {disruptResult.tasksRescheduled} rescheduled · {disruptResult.tasksDeferred} deferred to tomorrow
                      </Text>
                    </View>
                  </View>
                )}

                {/* Confirm */}
                <TouchableOpacity
                  onPress={handleDisrupt}
                  disabled={disruptLoading}
                  style={{
                    backgroundColor: '#ff6b6b', borderRadius: 20, paddingVertical: 16,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    opacity: disruptLoading ? 0.7 : 1,
                  }}
                >
                  {disruptLoading
                    ? <ActivityIndicator size="small" color="white" />
                    : <>
                        <Feather name="zap" size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Recalculate My Day</Text>
                      </>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDisruptModal(false)}
                  style={{ marginTop: 12, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: disruptResult ? '#111' : '#9ca3af', fontWeight: disruptResult ? '600' : '400', fontSize: 14 }}>
                    {disruptResult ? 'Done' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      </ScrollView>

      {/* ── MOBILE FLOATING ACTION BUTTON ──────────────── */}
      <TouchableOpacity
        className="xl:hidden absolute bottom-6 right-6 w-14 h-14 bg-[#ff6b6b] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, zIndex: 999 }}
        onPress={() => { setDisruptResult(null); setShowDisruptModal(true); }}
        activeOpacity={0.85}
      >
        <Feather name="zap" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}
