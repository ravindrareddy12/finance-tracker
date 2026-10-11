import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';
import { Badge, toneColor, type Tone } from './Badge';

interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  badge?: string;
}

export function StatTile({ label, value, sub, tone = 'neutral', badge }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={font.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, tone !== 'neutral' && { color: toneColor(tone) }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {badge ? <Badge label={badge} tone={tone} /> : null}
      {sub ? <Text style={font.caption} numberOfLines={2}>{sub}</Text> : null}
    </View>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile:  {
    flexGrow: 1, flexBasis: '45%', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  value: { ...font.amount },
});
