import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, radius, spacing } from '@/theme';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  prefix?: string;
  suffix?: string;
  onChange: (v: number) => void;
}

// Slider plus an editable value box (typed values outside the range are ignored, like the web)
export function SliderField({ label, value, min, max, step, prefix, suffix, onChange }: SliderFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(/,/g, ''));
    if (!isNaN(n) && n >= min && n <= max) onChange(Math.round(n / step) * step);
    setDraft(null);
  };

  return (
    <View style={styles.field}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueBox}>
          {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
          <TextInput
            style={styles.value}
            value={draft ?? value.toLocaleString('en-IN')}
            onChangeText={setDraft}
            onFocus={() => setDraft(String(value))}
            onBlur={commit}
            onSubmitEditing={commit}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            accessibilityLabel={label}
          />
          {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
        </View>
      </View>
      <Slider
        value={Math.min(max, Math.max(min, value))}
        minimumValue={min}
        maximumValue={max}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={colors.positive}
        maximumTrackTintColor="#E5E7EB"
        thumbTintColor={colors.positive}
        accessibilityLabel={`${label} slider`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field:    { gap: spacing.xs },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label:    { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  valueBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.positiveSoft, borderWidth: 1, borderColor: '#A7F3D0', borderRadius: radius.sm, paddingHorizontal: spacing.sm, minWidth: 110, justifyContent: 'flex-end' },
  value:    { fontSize: 15, fontWeight: '700', color: colors.text, paddingVertical: 6, textAlign: 'right', minWidth: 50 },
  affix:    { fontSize: 14, fontWeight: '700', color: colors.textMuted },
});
