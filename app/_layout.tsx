import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { cssInterop } from 'react-native-css-interop';
import { LinearGradient } from 'expo-linear-gradient';
import '../global.css';

cssInterop(LinearGradient, {
  className: 'style',
});

import { requestPermissions } from '../lib/notifications';
import { registerForceLogout } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

// Register at module load time so the handler is always in place before any
// API call fires, regardless of when React effects flush.
registerForceLogout(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
  setTimeout(() => {
    try {
      router.replace('/auth/login');
    } catch (e) {}
  }, 100);
});

export default function RootLayout() {
  useEffect(() => {
    requestPermissions();
    useUIStore.getState().loadPersistedPrefs();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
