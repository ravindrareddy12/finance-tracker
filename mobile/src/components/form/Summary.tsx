import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export interface SummaryLine { label: string; value: string; strong?: boolean; tone?: 'positive' | 'negative' }

// Grey preview box (totals, balance after, …) like the web forms show
export function Summary({ lines }: { lines: SummaryLine[] }) {
  return (
    <View style={styles.box}>
      {lines.map((l, i) => (
        <View key={l.label} style={[styles.row, l.strong && i > 0 && styles.strongRow]}>
          <Text style={[styles.label, l.strong && styles.strong]}>{l.label}</Text>
          <Text style={[styles.value, l.strong && styles.strong, l.tone && { color: l.tone === 'positive' ? colors.positive : colors.negative }]}>{l.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Two form fields side by side */
export function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.fieldRow}>
      {React.Children.map(children, child => (child ? <View style={styles.flex}>{child}</View> : null))}
    </View>
  );
}

const styles = StyleSheet.create({
  box:       { backgroundColor: '#F1F5F9', borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  row:       { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  strongRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#CBD5E1', paddingTop: spacing.xs, marginTop: 2 },
  label:     { fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  value:     { fontSize: 14, color: colors.textMuted },
  strong:    { color: colors.text, fontWeight: '700' },
  fieldRow:  { flexDirection: 'row', gap: spacing.md },
  flex:      { flex: 1 },
});
