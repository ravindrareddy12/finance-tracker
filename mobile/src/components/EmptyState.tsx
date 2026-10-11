import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

export function EmptyState({ icon, title, message }: { icon: keyof typeof Ionicons.glyphMap; title: string; message?: string }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={40} color={colors.textSubtle} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  title:   { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  message: { fontSize: 14, color: colors.textSubtle, textAlign: 'center' },
});
