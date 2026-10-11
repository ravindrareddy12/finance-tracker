import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

interface Option<T extends string> { value: T; label: string }

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map(o => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active && styles.active]}
            accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <Text style={[styles.label, active && styles.activeLabel]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track:   { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm },
  active:  { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  label:   { fontSize: 14, fontWeight: '500', color: colors.textMuted },
  activeLabel: { color: colors.primary, fontWeight: '600' },
});
