import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getItem } from '../lib/storage';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const loadUser = useAuthStore(state => state.loadUser);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await getItem('accessToken');
        if (token) {
          await loadUser();
          // Read state after the call — loadUser sets isAuthenticated:false on failure
          const { isAuthenticated } = useAuthStore.getState();
          router.replace(isAuthenticated ? '/(tabs)/' : '/auth/login');
        } else {
          router.replace('/auth/login');
        }
      } catch {
        router.replace('/auth/login');
      }
    }

    // Slight timeout ensures the navigation tree is fully mounted before routing
    const timeout = setTimeout(checkAuth, 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}
