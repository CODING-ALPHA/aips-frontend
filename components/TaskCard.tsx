import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Animated, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Task } from '../lib/types';
import { PRIORITY_COLORS } from '../lib/constants';
import { useTaskStore } from '../store/taskStore';

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  complete:    { bg: '#ECFDF5', text: '#059669', label: 'Done' },
  deferred:    { bg: '#F9FAFB', text: '#9CA3AF', label: 'Deferred' },
  in_progress: { bg: '#EFF6FF', text: '#3B82F6', label: 'In Progress' },
  pending:     { bg: '#F9FAFB', text: '#6B7280', label: 'Pending' },
};

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const completeTask = useTaskStore(state => state.completeTask);
  const deleteTask = useTaskStore(state => state.deleteTask);
  const swipeableRef = useRef<Swipeable>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleComplete = () => {
    swipeableRef.current?.close();
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(async () => { await completeTask(task._id); });
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure?')) {
        deleteTask(task._id);
      }
    } else {
      Alert.alert('Delete Task', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task._id) },
      ]);
    }
  };

  const renderRightActions = () => (
    <View style={{ flexDirection: 'row', width: isComplete ? 75 : 150, borderRadius: 20, overflow: 'hidden', marginLeft: 8 }}>
      {!isComplete && (
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}
          onPress={handleComplete}
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={{ color: 'white', fontWeight: '700', marginTop: 4, fontSize: 11 }}>Done</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}
        onPress={handleDelete}
      >
        <Ionicons name="trash" size={24} color="white" />
        <Text style={{ color: 'white', fontWeight: '700', marginTop: 4, fontSize: 11 }}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const isDeferred = task.status === 'deferred';
  const isComplete = task.status === 'complete';
  const priorityStyles = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS];
  const statusStyle = STATUS_STYLE[task.status] ?? STATUS_STYLE.pending;

  const formatTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Unscheduled';
  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'No deadline';

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
        <TouchableOpacity
          style={{
            backgroundColor: '#FEFDFB',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#EAE6E1',
            overflow: 'hidden',
            flexDirection: 'row',
            opacity: isDeferred ? 0.65 : 1,
          }}
          onPress={() => router.push(`/(tabs)/tasks/${task._id}`)}
          activeOpacity={0.8}
        >
          {/* Priority accent bar */}
          <View style={{
            width: 4,
            backgroundColor: priorityStyles.solid,
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
          }} />

          <View style={{ flex: 1, padding: 14 }}>
            {/* Title row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: '#111827',
                  fontWeight: '700',
                  fontStyle: isDeferred ? 'italic' : 'normal',
                  textDecorationLine: isComplete ? 'line-through' : 'none',
                  opacity: isComplete ? 0.55 : 1,
                  marginRight: 8,
                }}
                numberOfLines={1}
              >
                {task.title}
              </Text>
              <View style={{ flexDirection: 'row', gap: 5, flexShrink: 0 }}>
                <View style={{ backgroundColor: priorityStyles.soft, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                  <Text style={{ color: priorityStyles.solid, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {task.priority}
                  </Text>
                </View>
                <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }}>
                  <Text style={{ color: statusStyle.text, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                    {statusStyle.label}
                  </Text>
                </View>
              </View>
            </View>

            {/* Meta row */}
            <View style={{ flexDirection: 'row', gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={13} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '500' }}>
                  {formatTime(task.scheduledStart)} · {task.durationMinutes}m
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="flag-outline" size={13} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontSize: 12, fontWeight: '500' }}>
                  {formatDate(task.deadline)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
}
