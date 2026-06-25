import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, KeyboardAvoidingView, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTaskStore } from '../../../store/taskStore';
import { TaskPriority } from '../../../lib/types';

const BG = '#F8F5F1';
const NEON = '#d4f964';

export default function EditTask() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tasks = useTaskStore(state => state.tasks);
  const updateTask = useTaskStore(state => state.updateTask);
  const deleteTask = useTaskStore(state => state.deleteTask);
  const insets = useSafeAreaInsets();

  const existingTask = tasks.find(t => t._id === id);

  const [title, setTitle] = useState(existingTask?.title || '');
  const [duration, setDuration] = useState(existingTask?.durationMinutes?.toString() || '');
  const [priority, setPriority] = useState<TaskPriority>(existingTask?.priority || 'medium');
  const [deadline, setDeadline] = useState<Date>(() => {
    if (existingTask?.deadline) return new Date(existingTask.deadline);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!existingTask) router.replace('/(tabs)/tasks');
  }, [existingTask]);

  if (!existingTask) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="black" />
      </View>
    );
  }

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!duration) {
      newErrors.duration = 'Duration is required';
    } else if (isNaN(parseInt(duration, 10)) || parseInt(duration, 10) <= 0) {
      newErrors.duration = 'Must be a positive number';
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) return;
    setIsSubmitting(true);
    setFormErrors({});
    setSuccessMsg('');
    try {
      await updateTask(id, {
        title: title.trim(),
        durationMinutes: parseInt(duration, 10),
        priority,
        deadline: deadline.toISOString(),
      });
      setSuccessMsg('Task updated successfully!');
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (err: any) {
      setFormErrors({ form: err.message || 'Failed to update task' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;

    const performDelete = async () => {
      setIsDeleting(true);
      try {
        await deleteTask(id);
        router.replace('/(tabs)/tasks');
      } catch {
        setIsDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this task?')) {
        performDelete();
      }
    } else {
      Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      
      {/* Header */}
      <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 24, paddingBottom: 20 }} className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 bg-white rounded-xl items-center justify-center border border-gray-100 shadow-sm"
          >
            <Feather name="arrow-left" size={20} color="black" />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-black text-black">Edit Task</Text>
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleDelete}
          disabled={isDeleting}
          className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center border border-red-100"
        >
          {isDeleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Feather name="trash-2" size={18} color="#ef4444" />}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} className="w-full px-6" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

          <View className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm mb-6">
            <View className="mb-6">
              <FieldLabel>Task Name</FieldLabel>
              <TextInput
                className="text-xl font-bold text-black p-0"
                placeholder="What needs to be done?"
                placeholderTextColor="#d1d5db"
                 value={title}
                onChangeText={setTitle}
              />
              {formErrors?.title && <Text className="text-red-500 text-[10px] mt-1 font-bold">{formErrors.title}</Text>}
            </View>

            <View className="flex-col md:flex-row gap-4 mb-6">
              <View className="flex-1">
                <FieldLabel>Duration (min)</FieldLabel>
                <TextInput
                  className="text-lg font-bold text-black p-0"
                  placeholder="e.g. 60"
                  placeholderTextColor="#d1d5db"
                  keyboardType="numeric"
                   value={duration}
                  onChangeText={(t) => setDuration(t.replace(/[^0-9]/g, ''))}
                />
                {formErrors?.duration && <Text className="text-red-500 text-[10px] mt-1 font-bold">{formErrors.duration}</Text>}
              </View>
              <TouchableOpacity onPress={() => setShowDatePicker(true)} className="flex-1 relative">
                <FieldLabel>Deadline</FieldLabel>
                <Text className="text-lg font-bold text-black">
                  {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
                {Platform.OS === 'web' && (
                  <input 
                    type="datetime-local" 
                    value={new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000).toISOString().slice(0,16)}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDeadline(new Date(e.target.value));
                      }
                    }}
                    style={{ position: 'absolute', opacity: 0, top: 0, bottom: 0, left: 0, right: 0, width: '100%', cursor: 'pointer' } as any}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View>
              <FieldLabel>Priority</FieldLabel>
              <View className="flex-row flex-wrap gap-2 mt-2">
                {(['high', 'medium', 'low'] as TaskPriority[]).map(p => {
                  const isActive = priority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPriority(p)}
                      className={`flex-1 py-3 rounded-2xl items-center border ${isActive ? 'bg-black border-black' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <Text className={`text-xs font-bold capitalize ${isActive ? 'text-white' : 'text-gray-500'}`}>{p}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {formErrors?.form && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex-row items-center gap-3">
              <Feather name="alert-circle" size={18} color="#ef4444" />
              <Text className="text-red-800 font-bold flex-1 text-xs">{formErrors.form}</Text>
            </View>
          )}

          {successMsg ? (
            <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex-row items-center gap-3">
              <Feather name="check-circle" size={18} color="#10b981" />
              <Text className="text-emerald-800 font-bold flex-1 text-xs">{successMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity 
            onPress={handleSubmit} 
            disabled={isSubmitting || !!successMsg}
            className="bg-black py-5 rounded-[24px] items-center justify-center flex-row gap-3 shadow-lg"
          >
            {isSubmitting ? <ActivityIndicator color={NEON} /> : <Feather name="check" size={18} color={NEON} />}
            <Text className="text-white font-black uppercase tracking-widest text-sm">Save Changes</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={deadline} mode="datetime" display="default"
          onChange={(ev, d) => { setShowDatePicker(false); if (d) setDeadline(d); }}
        />
      )}

      {Platform.OS === 'ios' && showDatePicker && (
        <Modal transparent animationType="slide">
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-black font-black text-lg">Select Deadline</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)} className="bg-black px-6 py-3 rounded-2xl">
                  <Text className="text-white font-bold uppercase tracking-widest text-xs">Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={deadline} mode="datetime" display="spinner" textColor="black"
                onChange={(ev, d) => { if (d) setDeadline(d); }}
              />
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return <Text className="text-black text-[9px] font-bold tracking-widest uppercase mb-1">{children}</Text>;
}
