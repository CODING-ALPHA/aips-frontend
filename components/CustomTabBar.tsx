import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#6C63FF';
const PRIMARY_SUBTLE = '#EEEDF8';
const INACTIVE = '#B4AFCA';
const BORDER = '#EAE6E1';

const TABS = [
  { name: 'index',     label: 'Home',    icon: 'home-outline',           iconActive: 'home'            },
  { name: 'tasks',     label: 'Tasks',   icon: 'checkmark-circle-outline', iconActive: 'checkmark-circle' },
  { name: 'analytics', label: 'Stats',   icon: 'bar-chart-outline',      iconActive: 'bar-chart'       },
  { name: 'profile',   label: 'Profile', icon: 'person-outline',         iconActive: 'person'          },
] as const;

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: Math.max(insets.bottom, 8) + 12 }]}>
      <View style={styles.pill}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tab = TABS.find(t => t.name === route.name);
          if (!tab) return null;

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isFocused ? tab.iconActive : tab.icon}
                size={22}
                color={isFocused ? PRIMARY : INACTIVE}
              />
              <Text style={[styles.label, { color: isFocused ? PRIMARY : INACTIVE, fontWeight: isFocused ? '700' : '500' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
  },
  pill: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 6,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 32,
    gap: 3,
  },
  tabItemActive: {
    backgroundColor: PRIMARY_SUBTLE,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});
