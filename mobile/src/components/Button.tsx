import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed, inactive && styles.inactive]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} />
        : <Text style={[styles.label, variant !== 'primary' && styles[`${variant}Label`]]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base:      { minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primary:   { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger:    { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#FECACA' },
  pressed:   { opacity: 0.85 },
  inactive:  { opacity: 0.6 },
  label:     { color: colors.white, fontSize: 16, fontWeight: '600' },
  secondaryLabel: { color: colors.text },
  dangerLabel:    { color: colors.negative },
});
