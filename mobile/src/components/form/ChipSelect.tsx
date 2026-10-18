import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

interface Option<T extends string> { value: T; label: string }

// Wrapping single-choice chips — the app's stand-in for the web's <select>
export function ChipSelect<T extends string>({ label, options, value, onChange, hint }: {
  label?: string; options: Option<T>[]; value: T; onChange: (v: T) => void; hint?: string;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {options.map(o => {
          const active = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, active && styles.active]}
              accessibilityRole="radio" accessibilityState={{ selected: active }}>
              <Text style={[styles.text, active && styles.activeText]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field:  { gap: 6 },
  label:  { fontSize: 14, fontWeight: '500', color: colors.text },
  chips:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip:   { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  active: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text:   { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  activeText: { color: colors.primary, fontWeight: '600' },
  hint:   { fontSize: 12, color: colors.textMuted },
});
