import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="real-estate" options={{ title: 'Real Estate' }} />
      <Stack.Screen name="loans" options={{ title: 'Interest Investments' }} />
      <Stack.Screen name="investments" options={{ title: 'Additional Investments' }} />
      <Stack.Screen name="expenses" options={{ title: 'Monthly Expenses' }} />
      <Stack.Screen name="fire" options={{ title: 'FIRE Calculator' }} />
      <Stack.Screen name="configuration" options={{ title: 'Configuration' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete Account' }} />
    </Stack>
  );
}
