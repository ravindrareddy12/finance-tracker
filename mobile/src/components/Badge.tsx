import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

export type Tone = 'positive' | 'negative' | 'neutral' | 'warning';

const palette: Record<Tone, { bg: string; fg: string }> = {
  positive: { bg: colors.positiveSoft, fg: colors.positive },
  negative: { bg: colors.negativeSoft, fg: colors.negative },
  neutral:  { bg: '#F1F5F9', fg: colors.textMuted },
  warning:  { bg: colors.warningSoft, fg: colors.warning },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { bg, fg } = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

export const toneColor = (tone: Tone) => palette[tone].fg;

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, alignSelf: 'flex-start' },
  text:  { fontSize: 12, fontWeight: '600' },
});
