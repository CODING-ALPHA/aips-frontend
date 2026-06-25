import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView, Modal } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTaskStore } from '../../../store/taskStore';
import { TaskPriority } from '../../../lib/types';
import { PRIORITY_COLORS } from '../../../lib/constants';

const BG = '#F8F5F1';
const NEON = '#d4f964';

type PickerTarget = 'start' | 'end' | 'deadline' | null;

function fmt12(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtDateTimeDisplay(date: Date) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return fmt12(date);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + fmt12(date);
}

function toDateTimeLocal(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  return d;
}

export default function AddTask() {
  const addTask = useTaskStore(state => state.addTask);
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [description, setDescription] = useState('');

  const [deadline, setDeadline] = useState<Date>(defaultDeadline);

  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [endTime, setEndTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(10, 0, 0, 0);
    return d;
  });

  const pickerTargetRef = useRef<PickerTarget>(null);
  const [pickerTarget, _setPickerTarget] = useState<PickerTarget>(null);
  const setPickerTarget = (t: PickerTarget) => {
    pickerTargetRef.current = t;
    _setPickerTarget(t);
  };

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pickerValue, setPickerValue] = useState<Date>(new Date());

  const openPicker = (target: PickerTarget) => {
    const val = target === 'start' ? startTime : target === 'end' ? endTime : deadline;
    setPickerValue(new Date(val));
    setPickerTarget(target);
  };

  const commitPickerValue = (date: Date) => {
    const target = pickerTargetRef.current;
    if (target === 'start') {
      const gap = endTime.getTime() - startTime.getTime();
      setStartTime(date);
      const newEnd = new Date(date.getTime() + gap);
      setEndTime(newEnd);
      setDuration(String(Math.max(1, Math.round(gap / 60000))));
    } else if (target === 'end') {
      setEndTime(date);
      const mins = Math.round((date.getTime() - startTime.getTime()) / 60000);
      if (mins > 0) setDuration(String(mins));
    } else if (target === 'deadline') {
      setDeadline(date);
    }
  };

  const handlePickerChange = (_: any, selected?: Date) => {
    if (!selected) { setPickerTarget(null); return; }
    setPickerValue(selected);
    if (Platform.OS === 'android') {
      commitPickerValue(selected);
      setPickerTarget(null);
    }
  };

  const handleIosDone = () => {
    commitPickerValue(pickerValue);
    setPickerTarget(null);
  };

  // Fix #1: typing duration now drives endTime
  const handleDurationChange = (text: string) => {
    setDuration(text);
    const mins = parseInt(text, 10);
    if (!isNaN(mins) && mins > 0) {
      setEndTime(new Date(startTime.getTime() + mins * 60000));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Required';

    const mins = parseInt(duration, 10);
    if (!duration || isNaN(mins) || mins <= 0) {
      errors.duration = 'Required';
    } else if (mins > 480) {
      // Fix #2: enforce backend's 480-minute cap on the frontend
      errors.duration = 'Max 480 minutes (8 hours)';
    }

    if (endTime <= startTime) errors.time = 'End time must be after start time';

    // Fix #5: deadline must be in the future
    if (deadline <= new Date()) errors.deadline = 'Deadline must be in the future';

    // Fix #6: scheduled start must precede deadline
    if (startTime >= deadline) errors.schedule = 'Scheduled start must be before the deadline';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await addTask({
        title: title.trim(),
        durationMinutes: parseInt(duration, 10),
        priority,
        deadline: deadline.toISOString(),
        scheduledStart: startTime.toISOString(),
        scheduledEnd: endTime.toISOString(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      // Fix #7: NestJS validation returns message as string[]
      const msg = err.response?.data?.message;
      setFormErrors({ form: Array.isArray(msg) ? msg.join(', ') : (msg || err.message || 'Failed to create task') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = Platform.select({ web: { outlineStyle: 'none' } as any, default: {} });

  const durationMins = endTime > startTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>

      {/* HEADER */}
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F3F4F6' }}
        >
          <Feather name="x" size={20} color="black" />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '900', color: 'black' }}>New Task</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1, paddingHorizontal: 24 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

          {/* TASK TITLE */}
          <View style={{ marginTop: 24, marginBottom: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'black', marginBottom: 10, marginLeft: 4 }}>Main Objective</Text>
            <View style={{ backgroundColor: 'white', borderRadius: 32, borderWidth: 1, borderColor: '#E5E7EB', padding: 32, minHeight: 100 }}>
              <TextInput
                style={[inputStyle, { fontSize: 22, fontWeight: '900', color: 'black', padding: 0 }]}
                placeholder="Enter task title..."
                placeholderTextColor="#D1D5DB"
                multiline
                value={title}
                onChangeText={setTitle}
                autoFocus
              />
            </View>
            {formErrors.title && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>{formErrors.title}</Text>}
          </View>

          {/* START & END TIME — Fix #3: full datetime, not time-only */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'black', marginBottom: 10, marginLeft: 4 }}>Scheduled Time</Text>
            <View style={{ backgroundColor: 'white', borderRadius: 32, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 28, paddingVertical: 24 }}>

              {Platform.OS === 'web' ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>Start</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 32, height: 32, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="play" size={13} color="black" />
                      </View>
                      <input
                        type="datetime-local"
                        value={toDateTimeLocal(startTime)}
                        onChange={e => {
                          if (!e.target.value) return;
                          const d = new Date(e.target.value);
                          const gap = endTime.getTime() - startTime.getTime();
                          setStartTime(d);
                          setEndTime(new Date(d.getTime() + gap));
                          setDuration(String(Math.max(1, Math.round(gap / 60000))));
                        }}
                        style={{ fontSize: 13, fontWeight: '900', border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', color: 'black' } as any}
                      />
                    </View>
                  </View>

                  <View style={{ width: 1, height: 44, backgroundColor: '#E5E7EB', alignSelf: 'center' }} />

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 6 }}>End</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 32, height: 32, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="square" size={13} color="black" />
                      </View>
                      <input
                        type="datetime-local"
                        value={toDateTimeLocal(endTime)}
                        onChange={e => {
                          if (!e.target.value) return;
                          const d = new Date(e.target.value);
                          setEndTime(d);
                          const mins = Math.round((d.getTime() - startTime.getTime()) / 60000);
                          if (mins > 0) setDuration(String(mins));
                        }}
                        style={{ fontSize: 13, fontWeight: '900', border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', color: 'black' } as any}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <TouchableOpacity onPress={() => openPicker('start')} style={{ flex: 1, paddingRight: 12 }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>Start</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="play" size={14} color="black" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: 'black' }}>{fmtDateTimeDisplay(startTime)}</Text>
                        <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '600', marginTop: 1 }}>tap to change</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <View style={{ width: 1, height: 54, backgroundColor: '#E5E7EB', alignSelf: 'center' }} />

                  <TouchableOpacity onPress={() => openPicker('end')} style={{ flex: 1, paddingLeft: 12 }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: '#9CA3AF', marginBottom: 8 }}>End</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 36, height: 36, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                        <Feather name="square" size={14} color="black" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: 'black' }}>{fmtDateTimeDisplay(endTime)}</Text>
                        <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '600', marginTop: 1 }}>tap to change</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {durationMins !== null && durationMins > 0 && (
                <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="clock" size={12} color="#9CA3AF" />
                  <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700' }}>{durationMins} min duration</Text>
                </View>
              )}
            </View>
            {formErrors.time && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>{formErrors.time}</Text>}
            {formErrors.schedule && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 4, marginLeft: 4 }}>{formErrors.schedule}</Text>}
          </View>

          {/* DURATION + DEADLINE */}
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 20 }}>
            {/* Duration */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'black', marginBottom: 10, marginLeft: 4 }}>Duration</Text>
              <View style={{ backgroundColor: 'white', borderRadius: 32, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="clock" size={14} color="black" />
                </View>
                <TextInput
                  style={[inputStyle, { fontSize: 20, fontWeight: '900', color: 'black', padding: 0, flex: 1 }]}
                  placeholder="60"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={handleDurationChange}
                  maxLength={3}
                />
                <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700' }}>min</Text>
              </View>
              {formErrors.duration && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>{formErrors.duration}</Text>}
            </View>

            {/* Deadline */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'black', marginBottom: 10, marginLeft: 4 }}>Deadline</Text>
              {Platform.OS === 'web' ? (
                <View style={{ backgroundColor: 'white', borderRadius: 32, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 32, height: 32, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="calendar" size={14} color="black" />
                  </View>
                  <input
                    type="datetime-local"
                    value={toDateTimeLocal(deadline)}
                    onChange={e => { if (e.target.value) setDeadline(new Date(e.target.value)); }}
                    style={{ fontSize: 13, fontWeight: '700', border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', color: 'black', flex: 1 } as any}
                  />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => openPicker('deadline')}
                  activeOpacity={0.7}
                  style={{ backgroundColor: 'white', borderRadius: 32, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <View style={{ width: 32, height: 32, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="calendar" size={14} color="black" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: 'black', lineHeight: 24 }}>
                      {deadline.toLocaleDateString('en-US', { day: 'numeric' })}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#9CA3AF', fontWeight: '600' }}>
                      {deadline.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {formErrors.deadline && <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', marginTop: 6, marginLeft: 4 }}>{formErrors.deadline}</Text>}
            </View>
          </View>

          {/* PRIORITY */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'black', marginBottom: 10, marginLeft: 4 }}>Importance</Text>
            <View style={{ backgroundColor: 'white', borderRadius: 32, borderWidth: 1, borderColor: '#E5E7EB', padding: 20 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['high', 'medium', 'low'] as TaskPriority[]).map(p => {
                  const isActive = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      activeOpacity={0.8}
                      style={{ flex: 1, paddingVertical: 14, borderRadius: 18, alignItems: 'center', borderWidth: 2, backgroundColor: isActive ? 'black' : '#F9FAFB', borderColor: isActive ? 'black' : '#F3F4F6' }}
                    >
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PRIORITY_COLORS[p].solid, marginBottom: 6 }} />
                      <Text style={{ fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, color: isActive ? 'white' : '#9CA3AF' }}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* DESCRIPTION */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: 'black', marginBottom: 10, marginLeft: 4 }}>Notes (optional)</Text>
            <View style={{ backgroundColor: 'white', borderRadius: 32, borderWidth: 1, borderColor: '#E5E7EB', padding: 28, minHeight: 110 }}>
              <TextInput
                style={[inputStyle, { fontSize: 14, fontWeight: '500', color: 'black', padding: 0 }]}
                placeholder="Any extra details..."
                placeholderTextColor="#D1D5DB"
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          {formErrors.form && <Text style={{ color: '#EF4444', textAlign: 'center', marginBottom: 16, fontWeight: '700' }}>{formErrors.form}</Text>}

          {/* SUBMIT */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
            style={{ backgroundColor: 'black', paddingVertical: 22, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}
          >
            {isSubmitting ? <ActivityIndicator color={NEON} /> : <Feather name="zap" size={20} color={NEON} />}
            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, fontSize: 13 }}>Create Task</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ANDROID PICKER — Fix #3: mode is always datetime */}
      {Platform.OS === 'android' && pickerTarget !== null && (
        <DateTimePicker
          value={pickerValue}
          mode="datetime"
          display="default"
          onChange={handlePickerChange}
        />
      )}

      {/* iOS PICKER MODAL — Fix #3: mode is always datetime */}
      {Platform.OS === 'ios' && pickerTarget !== null && (
        <Modal transparent animationType="slide" onRequestClose={() => setPickerTarget(null)}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
            activeOpacity={1}
            onPress={handleIosDone}
          />
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Text style={{ color: '#6B7280', fontWeight: '700', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontWeight: '900', fontSize: 16, color: 'black' }}>
                {pickerTarget === 'start' ? 'Start Time' : pickerTarget === 'end' ? 'End Time' : 'Deadline'}
              </Text>
              <TouchableOpacity onPress={handleIosDone}>
                <Text style={{ color: 'black', fontWeight: '900', fontSize: 15 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={pickerValue}
              mode="datetime"
              display="spinner"
              textColor="black"
              onChange={handlePickerChange}
              style={{ height: 200 }}
            />
          </View>
        </Modal>
      )}

      {/* SUCCESS MODAL */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <View style={{ backgroundColor: 'white', borderRadius: 48, padding: 48, width: '100%', maxWidth: 440, alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, backgroundColor: 'black', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
              <Feather name="check" size={40} color={NEON} />
            </View>
            <Text style={{ fontSize: 26, fontWeight: '900', color: 'black', marginBottom: 10, textAlign: 'center' }}>Task Created</Text>
            <Text style={{ color: '#6B7280', textAlign: 'center', marginBottom: 36, lineHeight: 22, fontSize: 14 }}>
              <Text style={{ color: 'black', fontWeight: '700' }}>"{title}"</Text>
              {' '}scheduled for {fmt12(startTime)} – {fmt12(endTime)}.
            </Text>
            <TouchableOpacity
              onPress={() => { setShowSuccessModal(false); router.replace('/(tabs)/tasks'); }}
              activeOpacity={0.85}
              style={{ width: '100%', backgroundColor: 'black', paddingVertical: 18, borderRadius: 22, alignItems: 'center', marginBottom: 14 }}
            >
              <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>View Schedule</Text>
            </TouchableOpacity>
            {/* Fix #4: Add Another also resets deadline */}
            <TouchableOpacity
              onPress={() => {
                setShowSuccessModal(false);
                setTitle('');
                setDescription('');
                setDuration('60');
                const d = new Date();
                d.setHours(9, 0, 0, 0);
                setStartTime(d);
                const e = new Date();
                e.setHours(10, 0, 0, 0);
                setEndTime(e);
                setDeadline(defaultDeadline());
              }}
            >
              <Text style={{ color: '#9CA3AF', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, fontSize: 11 }}>Add Another</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
