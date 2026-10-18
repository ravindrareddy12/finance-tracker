import React from 'react';
import { Stack } from 'expo-router';
import { useAutoSIP } from '@/features/funds/useAutoSIP';
import { colors } from '@/theme';

export default function AppLayout() {
  useAutoSIP();
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
      <Stack.Screen name="expense-report" options={{ title: 'Expense Summary' }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Stack.Screen name="fund/[id]" options={{ title: 'Fund' }} />
      <Stack.Screen name="fire" options={{ title: 'FIRE Calculator' }} />
      <Stack.Screen name="configuration" options={{ title: 'Configuration' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete Account' }} />
    </Stack>
  );
}
