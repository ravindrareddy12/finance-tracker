import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

type BannerTone = 'negative' | 'warning' | 'info' | 'positive';

const tones: Record<BannerTone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  negative: { bg: colors.negativeSoft, fg: colors.negative, icon: 'alert-circle' },
  warning:  { bg: colors.warningSoft,  fg: colors.warning,  icon: 'time-outline' },
  info:     { bg: colors.primarySoft,  fg: colors.primary,  icon: 'information-circle' },
  positive: { bg: colors.positiveSoft, fg: colors.positive, icon: 'checkmark-circle' },
};

export function Banner({ message, tone = 'info' }: { message: string; tone?: BannerTone }) {
  const t = tones[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]} accessibilityRole="alert">
      <Ionicons name={t.icon} size={18} color={t.fg} />
      <Text style={[styles.text, { color: t.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  text:   { flex: 1, fontSize: 14 },
});
