import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, Animated } from 'react-native';
import { PanGestureHandler, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import { Task } from '../lib/types';
import { PRIORITY_COLORS, SLOT_HEIGHT } from '../lib/constants';

interface TaskBlockProps {
  task: Task;
  onPress: () => void;
  onDragEnd?: (id: string, newStart: string, isManualOverride: boolean) => void;
  checkConflict?: (id: string, startStr: string, endStr: string) => boolean;
  findNextFreeSlot?: (id: string, startStr: string, durationMinutes: number) => string | null;
  computedTop?: number;
  computedHeight?: number;
  isInConflict?: boolean;
}

export function TaskBlock({ task, onPress, onDragEnd, checkConflict, findNextFreeSlot, computedTop, computedHeight, isInConflict }: TaskBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragConflicting, setIsDragConflicting] = useState(false);

  const timeToOffset = (timeStr?: string) => {
    if (!timeStr) return 0;
    const date = new Date(timeStr);
    const hours = date.getHours() + date.getMinutes() / 60;
    const slotIndex = (hours - 6) * 2;
    return slotIndex * SLOT_HEIGHT;
  };

  const initialTop = computedTop !== undefined ? computedTop : timeToOffset(task.scheduledStart);
  const topAnim = useRef(new Animated.Value(initialTop)).current;
  const translationY = useRef(new Animated.Value(0)).current;

  const blockHeight = computedHeight !== undefined ? computedHeight : (task.durationMinutes / 30) * SLOT_HEIGHT;

  useEffect(() => {
    if (!isDragging) {
      Animated.spring(topAnim, {
        toValue: computedTop !== undefined ? computedTop : timeToOffset(task.scheduledStart),
        useNativeDriver: false,
      }).start();
      translationY.setValue(0);
    }
  }, [task.scheduledStart, computedTop, topAnim, isDragging]);

  const color = PRIORITY_COLORS[task.priority]?.solid || '#6C63FF';

  const handleLongPress = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      setIsDragging(true);
    }
  };

  const offsetToTime = (offset: number) => {
    const slots = offset / SLOT_HEIGHT;
    const minutes = slots * 30 + 6 * 60;
    const snapped = Math.round(minutes / 15) * 15;
    const d = new Date();
    d.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
    return d;
  };

  const handlePan = ({ nativeEvent }: any) => {
    if (!isDragging) return;
    translationY.setValue(nativeEvent.translationY);

    if (checkConflict) {
      const prospectiveTop = initialTop + nativeEvent.translationY;
      const prospectiveStart = offsetToTime(prospectiveTop);
      const prospectiveEnd = new Date(prospectiveStart.getTime() + task.durationMinutes * 60000);
      setIsDragConflicting(
        checkConflict(task._id, prospectiveStart.toISOString(), prospectiveEnd.toISOString())
      );
    }
  };

  const handlePanStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const finalTop = initialTop + nativeEvent.translationY;
      const prospectiveStart = offsetToTime(finalTop);
      const prospectiveEnd = new Date(prospectiveStart.getTime() + task.durationMinutes * 60000);

      setIsDragging(false);
      setIsDragConflicting(false);
      translationY.setValue(0);

      const hasConflict = checkConflict
        ? checkConflict(task._id, prospectiveStart.toISOString(), prospectiveEnd.toISOString())
        : false;

      if (hasConflict && findNextFreeSlot) {
        // Auto-snap: find the nearest free slot and move there without prompting
        const freeStartStr = findNextFreeSlot(task._id, prospectiveStart.toISOString(), task.durationMinutes);
        if (freeStartStr && onDragEnd) {
          onDragEnd(task._id, freeStartStr, false);
        }
      } else if (onDragEnd) {
        // No conflict — place exactly where the user dropped (manual override)
        onDragEnd(task._id, prospectiveStart.toISOString(), true);
      }
    }
  };

  const animatedTop = Animated.add(topAnim, translationY).interpolate({
    inputRange: [0, 1920 - blockHeight],
    outputRange: [0, 1920 - blockHeight],
    extrapolate: 'clamp',
  });

  // Show red border during an active drag-conflict OR when resting in a detected conflict
  const showConflictBorder = isDragConflicting || (isInConflict && !isDragging);

  return (
    <PanGestureHandler onGestureEvent={handlePan} onHandlerStateChange={handlePanStateChange} minDist={10}>
      <Animated.View style={{
          position: 'absolute',
          top: animatedTop,
          left: 0,
          right: 0,
          height: blockHeight,
          backgroundColor: color,
          opacity: isDragging ? 0.9 : 0.85,
          borderRadius: 8,
          padding: 8,
          zIndex: isDragging ? 50 : 10,
          elevation: 3,
          shadowColor: color,
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          borderWidth: showConflictBorder ? 2 : 0,
          borderColor: showConflictBorder ? 'red' : 'transparent',
        }}>
        <LongPressGestureHandler onHandlerStateChange={handleLongPress} minDurationMs={500}>
          <TouchableOpacity onPress={onPress} style={{ flex: 1 }} activeOpacity={0.8} disabled={isDragging}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 }} numberOfLines={1}>
              {task.title}
            </Text>
            {task.durationMinutes >= 30 && (
              <Text style={{ color: 'white', fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 1, opacity: 0.9, marginTop: 4 }}>
                {task.durationMinutes} min
              </Text>
            )}
          </TouchableOpacity>
        </LongPressGestureHandler>
      </Animated.View>
    </PanGestureHandler>
  );
}
