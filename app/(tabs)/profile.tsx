import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Switch, Alert, ScrollView, ActivityIndicator, Platform, Modal
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../lib/api';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUIStore } from '../../store/uiStore';

const BG = '#F8F5F1';
const NEON = '#d4f964';

export default function Profile() {
  const { user, loadUser, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { toggleSidebar, remindersEnabled, setRemindersEnabled, dailyBriefingEnabled, setDailyBriefingEnabled } = useUIStore();

  const [displayName, setDisplayName]       = useState('');
  const [email, setEmail]                   = useState('');
  const [workStart, setWorkStart]           = useState(new Date());
  const [workEnd, setWorkEnd]               = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]   = useState(false);
  const [isLoading, setIsLoading]           = useState(true);
  const [isSaving, setIsSaving]             = useState(false);
  const [successMsg, setSuccessMsg]         = useState('');
  const [errorMsg, setErrorMsg]             = useState('');

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      loadUser().finally(() => setIsLoading(false));
    }, []),
  );

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.name  || '');
    setEmail(user.email || '');
    setRemindersEnabled(user.notificationsEnabled || false);

    const start = new Date();
    start.setHours(parseInt(user.workStartTime?.split(':')[0] || '9'), parseInt(user.workStartTime?.split(':')[1] || '0'), 0);
    setWorkStart(start);

    const end = new Date();
    end.setHours(parseInt(user.workEndTime?.split(':')[0] || '17'), parseInt(user.workEndTime?.split(':')[1] || '0'), 0);
    setWorkEnd(end);
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const startStr = `${workStart.getHours().toString().padStart(2, '0')}:${workStart.getMinutes().toString().padStart(2, '0')}`;
      const endStr   = `${workEnd.getHours().toString().padStart(2, '0')}:${workEnd.getMinutes().toString().padStart(2, '0')}`;

      await api.patch('/users/me', {
        name: displayName, email,
        workStartTime: startStr, workEndTime: endStr,
        notificationsEnabled: remindersEnabled,
      });

      if (user?.workStartTime !== startStr || user?.workEndTime !== endStr) {
        try { await api.post('/schedule/recalculate', { date: new Date().toISOString().split('T')[0] }); } catch {}
      }

      await loadUser();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update profile');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  const initials = (user?.name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      {/* ── HEADER ─────────────────────────────── */}
      <LinearGradient
        colors={['#d9f972','#e8fcc2','#c7e3ff']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{ paddingTop: insets.top + 8, paddingBottom: 8, zIndex: 9999, elevation: 9999 }}
      >
        <View className="w-full px-6 flex-row items-center justify-between h-14 relative z-[9999]">
          <View className="flex-row items-center gap-4 flex-1">
            <TouchableOpacity onPress={toggleSidebar} className="p-1 xl:hidden">
              <Feather name="menu" size={24} color="black" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-bold text-black">Profile</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="w-full" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={{ paddingTop: 10, paddingBottom: 30, paddingHorizontal: 24 }} className="items-center">
          <LinearGradient
            colors={['#111', '#333']}
            style={{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}
          >
            <Text className="text-3xl font-black" style={{ color: NEON }}>{initials}</Text>
          </LinearGradient>
          <Text className="text-2xl font-black text-black">{user?.name || 'User'}</Text>
          <Text className="text-gray-400 font-medium text-sm mt-1">{user?.email}</Text>
        </View>

        <View className="px-6">
          {successMsg ? (
            <View className="bg-emerald-50 border border-emerald-200 rounded-[24px] p-4 mb-6 flex-row items-center gap-3">
              <Feather name="check-circle" size={20} color="#10b981" />
              <Text className="text-emerald-800 font-semibold flex-1 text-sm">{successMsg}</Text>
            </View>
          ) : null}

          {errorMsg ? (
            <View className="bg-red-50 border border-red-200 rounded-[24px] p-4 mb-6 flex-row items-center gap-3">
              <Feather name="alert-circle" size={20} color="#ef4444" />
              <Text className="text-red-800 font-semibold flex-1 text-sm">{errorMsg}</Text>
            </View>
          ) : null}
          
          <SectionLabel>Account Details</SectionLabel>
          <View className="bg-white rounded-[28px] overflow-hidden border border-gray-100 shadow-sm mb-6">
            <View className="p-5 border-b border-gray-50">
              <FieldLabel>Display Name</FieldLabel>
              <TextInput value={displayName} onChangeText={setDisplayName} className="text-black font-bold text-lg p-0" />
            </View>
            <View className="p-5">
              <FieldLabel>Email Address</FieldLabel>
              <TextInput value={email} onChangeText={setEmail} className="text-black font-bold text-lg p-0" keyboardType="email-address" autoCapitalize="none" />
            </View>
          </View>

          <SectionLabel>Productivity Settings</SectionLabel>
          <View className="bg-white rounded-[28px] overflow-hidden border border-gray-100 shadow-sm mb-6">
            <TouchableOpacity onPress={() => setShowStartPicker(true)} className="p-5 border-b border-gray-50 flex-row justify-between items-center relative">
              <View>
                <FieldLabel>Deep Work Starts</FieldLabel>
                <Text className="text-black font-bold text-lg">{workStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Feather name="clock" size={20} color="gray" />
              {Platform.OS === 'web' && (
                <input 
                  type="time" 
                  value={`${workStart.getHours().toString().padStart(2, '0')}:${workStart.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [h, m] = e.target.value.split(':');
                      const d = new Date(workStart);
                      d.setHours(parseInt(h), parseInt(m), 0, 0);
                      setWorkStart(d);
                    }
                  }}
                  style={{ position: 'absolute', opacity: 0, top: 0, bottom: 0, left: 0, right: 0, width: '100%', cursor: 'pointer' } as any}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEndPicker(true)} className="p-5 flex-row justify-between items-center relative">
              <View>
                <FieldLabel>Deep Work Ends</FieldLabel>
                <Text className="text-black font-bold text-lg">{workEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Feather name="clock" size={20} color="gray" />
              {Platform.OS === 'web' && (
                <input 
                  type="time" 
                  value={`${workEnd.getHours().toString().padStart(2, '0')}:${workEnd.getMinutes().toString().padStart(2, '0')}`}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [h, m] = e.target.value.split(':');
                      const d = new Date(workEnd);
                      d.setHours(parseInt(h), parseInt(m), 0, 0);
                      setWorkEnd(d);
                    }
                  }}
                  style={{ position: 'absolute', opacity: 0, top: 0, bottom: 0, left: 0, right: 0, width: '100%', cursor: 'pointer' } as any}
                />
              )}
            </TouchableOpacity>
          </View>

          {Platform.OS === 'android' && showStartPicker && <DateTimePicker value={workStart} mode="time" display="default" onChange={(_, d) => { setShowStartPicker(false); if (d) setWorkStart(d); }} />}
          {Platform.OS === 'android' && showEndPicker && <DateTimePicker value={workEnd} mode="time" display="default" onChange={(_, d) => { setShowEndPicker(false); if (d) setWorkEnd(d); }} />}

          {Platform.OS === 'ios' && showStartPicker && (
            <Modal transparent animationType="slide">
              <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
                  <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-black font-black text-lg">Deep Work Starts</Text>
                    <TouchableOpacity onPress={() => setShowStartPicker(false)} className="bg-black px-6 py-3 rounded-2xl">
                      <Text className="text-white font-bold uppercase tracking-widest text-xs">Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker value={workStart} mode="time" display="spinner" textColor="black" onChange={(_, d) => { if (d) setWorkStart(d); }} />
                </View>
              </View>
            </Modal>
          )}

          {Platform.OS === 'ios' && showEndPicker && (
            <Modal transparent animationType="slide">
              <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <View className="bg-white rounded-t-3xl p-6 pb-10 shadow-2xl">
                  <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-black font-black text-lg">Deep Work Ends</Text>
                    <TouchableOpacity onPress={() => setShowEndPicker(false)} className="bg-black px-6 py-3 rounded-2xl">
                      <Text className="text-white font-bold uppercase tracking-widest text-xs">Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker value={workEnd} mode="time" display="spinner" textColor="black" onChange={(_, d) => { if (d) setWorkEnd(d); }} />
                </View>
              </View>
            </Modal>
          )}

          <SectionLabel>Preferences</SectionLabel>
          <View className="bg-white rounded-[28px] overflow-hidden border border-gray-100 shadow-sm mb-10">
            <View className="p-5 border-b border-gray-50 flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center">
                  <Feather name="bell" size={20} color="black" />
                </View>
                <View>
                  <Text className="text-black font-bold text-base">Task Reminders</Text>
                  <Text className="text-gray-400 text-xs">Notify 10m before start</Text>
                </View>
              </View>
              <Switch value={remindersEnabled} onValueChange={setRemindersEnabled} trackColor={{ false: '#e5e7eb', true: NEON }} thumbColor={remindersEnabled ? 'black' : 'white'} />
            </View>

            <View className="p-5 flex-row items-center justify-between">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-gray-100 rounded-2xl items-center justify-center">
                  <Feather name="sun" size={20} color="black" />
                </View>
                <View>
                  <Text className="text-black font-bold text-base">Daily Briefing</Text>
                  <Text className="text-gray-400 text-xs">Morning summary at 8:00 AM</Text>
                </View>
              </View>
              <Switch value={dailyBriefingEnabled} onValueChange={setDailyBriefingEnabled} trackColor={{ false: '#e5e7eb', true: NEON }} thumbColor={dailyBriefingEnabled ? 'black' : 'white'} />
            </View>
          </View>

          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isSaving}
            className="bg-black py-5 rounded-[24px] items-center justify-center flex-row gap-3 shadow-lg mb-4"
          >
            {isSaving ? <ActivityIndicator color={NEON} /> : <Feather name="save" size={18} color={NEON} />}
            <Text className="text-white font-black uppercase tracking-widest text-sm">Save Changes</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={logout}
            className="bg-white py-5 rounded-[24px] items-center justify-center border border-red-100"
          >
            <Text className="text-red-500 font-bold uppercase tracking-widest text-sm">Log Out</Text>
          </TouchableOpacity>

          <Text className="text-gray-400 text-[10px] text-center mt-10 font-bold uppercase tracking-tighter">
            AIPS Productivity Engine v1.0.4
          </Text>

        </View>
      </ScrollView>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="text-black text-[10px] font-bold tracking-widest uppercase mb-3 ml-2">{children}</Text>;
}

function FieldLabel({ children }: { children: string }) {
  return <Text className="text-black text-[9px] font-bold tracking-widest uppercase mb-1">{children}</Text>;
}
