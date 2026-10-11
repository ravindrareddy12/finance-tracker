import React, { type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

// Shared frame for sign-in / sign-up / reset: brand header + card, keyboard-aware
export function AuthLayout({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}><Ionicons name="trending-up" size={28} color={colors.white} /></View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.primaryDark },
  flex:     { flex: 1 },
  scroll:   { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  brand:    { alignItems: 'center', gap: spacing.sm },
  logo:     { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 24, fontWeight: '700', color: colors.white },
  subtitle: { fontSize: 15, color: '#BFDBFE', textAlign: 'center' },
  card:     { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.lg },
});
