import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  valueSub?: ReactNode;
  leading?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}

export function ListRow({ title, subtitle, value, valueSub, leading, onPress, last }: ListRowProps) {
  const body = (
    <View style={[styles.row, !last && styles.divider]}>
      {leading}
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {value !== undefined || valueSub ? (
        <View style={styles.trailing}>
          {value !== undefined ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
          {typeof valueSub === 'string' ? <Text style={styles.subtitle}>{valueSub}</Text> : valueSub}
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} /> : null}
    </View>
  );
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" android_ripple={{ color: '#E2E8F0' }}>{body}</Pressable>
    : body;
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 56 },
  divider:  { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  main:     { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end', gap: 2, maxWidth: '50%' },
  title:    { fontSize: 15, fontWeight: '500', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted },
  value:    { fontSize: 15, fontWeight: '600', color: colors.text },
});
