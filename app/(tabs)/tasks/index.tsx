import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTaskStore } from '../../../store/taskStore';
import { TaskCard } from '../../../components/TaskCard';
import { useUIStore } from '../../../store/uiStore';
import { LinearGradient } from 'expo-linear-gradient';

const BG = '#F8F5F1';
const NEON = '#d4f964';
import { PRIORITY_COLORS } from '../../../lib/constants';

/** Returns today's date as YYYY-MM-DD in local time (not UTC). */
function localDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function TasksIndex() {
  const [scope, setScope] = useState<'Today' | 'Upcoming'>('Today');
  const [activePriorities, setActivePriorities] = useState<string[]>(['high', 'medium', 'low']);
  const [activeStatuses, setActiveStatuses] = useState<string[]>(['pending', 'complete', 'in_progress', 'deferred']);
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();
  const fetchTasks = useTaskStore(state => state.fetchTasks);
  const tasks = useTaskStore(state => state.tasks);
  const isLoading = useTaskStore(state => state.isLoading);
  const { toggleSidebar } = useUIStore();

  const loadData = useCallback(async () => {
    const d = scope === 'Today' ? localDateString() : undefined;
    await fetchTasks(d ? { date: d } : undefined);
  }, [scope, fetchTasks]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const togglePriority = (p: string) => {
    setActivePriorities(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const toggleStatus = (s: string) => {
    setActiveStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const todayStr = localDateString();

  const filteredTasks = tasks.filter(t => {
    if (scope === 'Today') {
      // Compare using Date objects to avoid UTC vs local timezone mismatch
      if (!t.scheduledStart) return false;
      const taskDate = localDateString(new Date(t.scheduledStart));
      if (taskDate !== todayStr) return false;
    }
    if (!activePriorities.includes(t.priority)) return false;
    if (!activeStatuses.includes(t.status)) return false;
    return true;
  });

  return (
    <View className="flex-1" style={{ backgroundColor: BG }}>
      {/* ── HEADER ─────────────────────────────── */}
      <LinearGradient
        colors={['#d9f972','#e8fcc2','#c7e3ff']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 8, zIndex: 9999, elevation: 9999 }}
      >
        <View className="w-full px-6 flex-row items-center justify-between h-14 relative z-[9999]">
          <View className="flex-row items-center gap-4 flex-1">
            <TouchableOpacity onPress={toggleSidebar} className="p-1">
              <Feather name="menu" size={24} color="black" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-black">Schedule</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/tasks/add')}
              className="w-10 h-10 bg-black rounded-xl items-center justify-center shadow-sm"
            >
              <Feather name="plus" size={20} color={NEON} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View className="flex-1 w-full">

      {/* ── UNIFIED HORIZONTAL FILTERS ─────────── */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 10, alignItems: 'center' }}
          className="py-2"
        >
          {/* Scope Toggle (As Pills) */}
          <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.5)', padding: 4, borderRadius: 9999, borderWidth: 1, borderColor: '#E5E7EB', marginRight: 8 }}>
            {(['Today', 'Upcoming'] as const).map(s => (
              <TouchableOpacity
                key={s}
                onPress={() => setScope(s)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  backgroundColor: scope === s ? 'black' : 'transparent',
                  shadowColor: scope === s ? 'black' : undefined,
                  shadowOffset: scope === s ? { width: 0, height: 1 } : undefined,
                  shadowOpacity: scope === s ? 0.15 : undefined,
                  shadowRadius: 2,
                  elevation: scope === s ? 1 : 0,
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: scope === s ? 'white' : '#6B7280',
                }}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB', marginHorizontal: 4 }} />

          {/* Status Filters */}
          {['pending', 'complete', 'in_progress', 'deferred'].map(status => {
            const isActive = activeStatuses.includes(status);
            return (
              <TouchableOpacity
                key={status}
                onPress={() => toggleStatus(status)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: isActive ? 'black' : '#E5E7EB',
                  backgroundColor: isActive ? 'white' : 'transparent',
                  shadowColor: isActive ? 'black' : undefined,
                  shadowOffset: isActive ? { width: 0, height: 1 } : undefined,
                  shadowOpacity: isActive ? 0.15 : undefined,
                  shadowRadius: 2,
                  elevation: isActive ? 1 : 0,
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: 'bold',
                  textTransform: 'capitalize',
                  color: isActive ? 'black' : '#9CA3AF',
                }}>
                  {status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={{ width: 1, height: 24, backgroundColor: '#E5E7EB', marginHorizontal: 4 }} />

          {/* Priority Filters */}
          {['high', 'medium', 'low'].map(p => {
            const isActive = activePriorities.includes(p);
            return (
              <TouchableOpacity
                key={p}
                onPress={() => togglePriority(p)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: isActive ? 'black' : '#E5E7EB',
                  backgroundColor: isActive ? 'white' : 'transparent',
                  shadowColor: isActive ? 'black' : undefined,
                  shadowOffset: isActive ? { width: 0, height: 1 } : undefined,
                  shadowOpacity: isActive ? 0.15 : undefined,
                  shadowRadius: 2,
                  elevation: isActive ? 1 : 0,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                   <View style={{
                     width: 8,
                     height: 8,
                     borderRadius: 4,
                     backgroundColor: PRIORITY_COLORS[p as keyof typeof PRIORITY_COLORS].solid
                   }} />
                   <Text style={{
                     fontSize: 12,
                     fontWeight: 'bold',
                     textTransform: 'capitalize',
                     color: isActive ? 'black' : '#9CA3AF',
                   }}>
                    {p}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── TASK LIST ─────────────────────────── */}
      {isLoading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={t => t._id}
          renderItem={({ item }) => (
            <View className="px-6 mb-3">
              <TaskCard task={item} />
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="black" />}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 4, flexGrow: 1 }}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center px-10">
              <View className="w-20 h-20 bg-gray-100 rounded-3xl items-center justify-center mb-6">
                <Feather name="check-circle" size={40} color="#d1d5db" />
              </View>
              <Text className="text-xl font-bold text-black mb-2">No tasks found</Text>
              <Text className="text-gray-500 text-center leading-relaxed">
                Adjust your filters or add a new task to stay productive.
              </Text>

              <TouchableOpacity
                onPress={() => router.push('/(tabs)/tasks/add')}
                className="mt-8 bg-black px-8 py-4 rounded-2xl shadow-lg flex-row items-center gap-3"
              >
                <Feather name="plus" size={18} color={NEON} />
                <Text className="text-white font-bold">Add Task</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      </View>
    </View>
  );
}
