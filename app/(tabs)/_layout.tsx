import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, ScrollView } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useUIStore } from '../../store/uiStore';
import { requestPermissions, scheduleDailyMorningBriefing, cancelDailyMorningBriefing } from '../../lib/notifications';

const NEON = '#d4f964';

const CALENDAR_VIEWS = [
  { id: 'schedule', icon: 'view-agenda', label: 'Schedule', mode: 'Schedule' as const },
  { id: 'day', icon: 'view-day', label: 'Day', mode: 'Day' as const },
  { id: '3day', icon: 'view-week', label: '3 Day', mode: '3-Day' as const },
  { id: 'week', icon: 'calendar-view-week', label: 'Week', mode: 'Week' as const },
  { id: 'month', icon: 'calendar-view-month', label: 'Month', mode: 'Month' as const },
];

const NAV_ITEMS: Array<{ icon?: string; route?: string; label?: string; type?: string }> = [
  { icon: 'grid', route: '/(tabs)/', label: 'Dashboard' },
  { icon: 'list', route: '/(tabs)/tasks', label: 'Schedule' },
  { icon: 'pie-chart', route: '/(tabs)/analytics', label: 'Analytics' },
  { icon: 'user', route: '/(tabs)/profile', label: 'Profile' },
];

export default function TabLayout() {
  const pathname = usePathname();
  const { isSidebarOpen, setIsSidebarOpen, calendarViewMode, setCalendarViewMode, remindersEnabled, dailyBriefingEnabled } = useUIStore();
  const indicatorY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const isActive = (route: string) => {
    const cleanPath = pathname.replace(/\/$/, '') || '/';
    const cleanRoute = route.replace(/\/\(tabs\)/, '').replace(/\/$/, '') || '/';
    if (cleanRoute === '/' || cleanRoute === '/(tabs)') {
      return cleanPath === '/' || cleanPath === '/(tabs)';
    }
    return cleanPath === cleanRoute || cleanPath.startsWith(cleanRoute + '/');
  };

  useEffect(() => {
    let yPos = 32; // Offset for the "Apps" title height + margin
    for (const item of NAV_ITEMS) {
      if (item.type === 'divider') {
        yPos += 33; // 1px line + 16px margin top + 16px margin bottom
        continue;
      }
      if (isActive(item.route!)) {
        indicatorY.value = withTiming(yPos, { duration: 300, easing: Easing.out(Easing.quad) });
        break;
      }
      yPos += 56; // 48px height + 8px gap (mb-2)
    }
  }, [pathname]);

  // Handle Notifications Setup
  useEffect(() => {
    async function setupNotifications() {
      if (remindersEnabled || dailyBriefingEnabled) {
        const granted = await requestPermissions();
        if (granted && dailyBriefingEnabled) {
          await scheduleDailyMorningBriefing();
        } else {
          await cancelDailyMorningBriefing();
        }
      } else {
        await cancelDailyMorningBriefing();
      }
    }
    setupNotifications();
  }, [remindersEnabled, dailyBriefingEnabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: indicatorY.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F5F1' }}>
      <View className="flex-1 flex-row relative">
        
        {/* SIDEBAR OVERLAY — shown on all screen sizes when open */}
        {isSidebarOpen && (
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => setIsSidebarOpen(false)}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 40 }}
          />
        )}

        {/* ── GLOBAL SIDE NAVIGATION — always overlay, never docked ─────────── */}
        <View 
          style={{ 
            paddingTop: Math.max(insets.top, 16),
            backdropFilter: 'blur(16px)' 
          } as any}
          className={`${isSidebarOpen ? 'flex' : 'hidden'} absolute top-0 left-0 bottom-0 z-50 w-[280px] bg-white/95 pb-8 flex-col shadow-2xl border-r border-white/40`}
        >
          {/* Sidebar Header with Close Button — always visible */}
          <View className="flex-row items-center justify-between px-6 mb-6">
            <Text className="text-xl font-black text-black">AIPS</Text>
            <TouchableOpacity 
              onPress={() => setIsSidebarOpen(false)}
              className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
            >
              <Feather name="x" size={18} color="black" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 w-full" showsVerticalScrollIndicator={false}>
            
            {/* Navigation Items */}
            <View className="w-full px-5 pt-4 relative">
              <Text className="px-1 mb-4 font-bold text-gray-400 text-xs tracking-widest uppercase">Apps</Text>
              
              {/* Animated Indicator */}
              <Animated.View 
                style={[
                  { position: 'absolute', width: 240, height: 48, borderRadius: 16, backgroundColor: NEON, left: 20 },
                  animatedStyle
                ]}
                className="shadow-sm"
              />

              {NAV_ITEMS.map((item, idx) => {
                if (item.type === 'divider') {
                  return <View key={`div-${idx}`} className="w-full h-[1px] bg-gray-200 my-4" />;
                }
                
                const active = isActive(item.route!);
                return (
                  <TouchableOpacity 
                    key={item.route}
                    onPress={() => {
                      router.push(item.route as any);
                      setIsSidebarOpen(false);
                    }}
                    activeOpacity={1}
                    className={`w-full h-[48px] rounded-2xl flex-row items-center px-4 mb-2`}
                  >
                    <Feather 
                      name={item.icon as any} 
                      size={20} 
                      color={active ? "black" : "#6B7280"} 
                    />
                    <Text className={`ml-4 text-[15px] ${active ? 'font-bold text-black' : 'font-medium text-gray-500'}`}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="w-full h-[1px] bg-gray-200 my-4" />

            {/* View Selectors */}
            <View className="pr-4 pb-4">
              <Text className="px-6 mb-4 font-bold text-gray-400 text-xs tracking-widest uppercase">Calendar</Text>
              {CALENDAR_VIEWS.map((view) => {
                const isActiveView = calendarViewMode === view.mode;
                return (
                  <TouchableOpacity 
                    key={view.id}
                    onPress={() => {
                      setCalendarViewMode(view.mode);
                      router.push('/(tabs)/');
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full h-[48px] rounded-r-full flex-row items-center px-6 ${isActiveView ? 'bg-[#d4f964]/40' : ''}`}
                  >
                    <MaterialIcons name={view.icon as any} size={22} color={isActiveView ? '#000' : '#4b5563'} />
                    <Text className={`ml-6 text-[15px] ${isActiveView ? 'font-bold text-black' : 'font-medium text-gray-600'}`}>
                      {view.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View className="h-12" />
          </ScrollView>

          {/* ACTION BUTTON */}
          <View className="px-5 w-full mt-2">
            <TouchableOpacity 
              onPress={() => {
                router.push('/(tabs)/tasks/add');
                setIsSidebarOpen(false);
              }}
              activeOpacity={1}
              className="w-full h-14 bg-black rounded-2xl flex-row items-center justify-center shadow-lg gap-3"
            >
              <Feather name="plus" size={20} color={NEON} />
              <Text className="text-white font-bold text-[15px]">Create Task</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* ── MAIN CONTENT AREA ─────────────────────── */}
        <View className="flex-1">
          <Tabs screenOptions={{ 
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="tasks" />
            <Tabs.Screen name="analytics" />
            <Tabs.Screen name="profile" />
            <Tabs.Screen name="messages" />
            <Tabs.Screen name="settings" />
          </Tabs>
        </View>

      </View>
    </View>
  );
}
