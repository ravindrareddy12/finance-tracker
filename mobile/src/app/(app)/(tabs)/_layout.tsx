import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
function icon(name: IconName) {
  return function TabBarIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '700', color: colors.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index"  options={{ title: 'Dashboard', tabBarIcon: icon('grid-outline') }} />
      <Tabs.Screen name="equity" options={{ title: 'Equity',    tabBarIcon: icon('trending-up-outline') }} />
      <Tabs.Screen name="funds"  options={{ title: 'Funds',     tabBarIcon: icon('bar-chart-outline') }} />
      <Tabs.Screen name="more"   options={{ title: 'More',      tabBarIcon: icon('ellipsis-horizontal-circle-outline') }} />
    </Tabs>
  );
}
