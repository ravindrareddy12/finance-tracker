import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/format';
import { localIso, parseIso } from '@/lib/dates';
import { colors, radius, spacing } from '@/theme';

interface DateFieldProps {
  label: string;
  /** YYYY-MM-DD, or '' for none */
  value: string;
  onChange: (iso: string) => void;
  hint?: string;
  minimumDate?: string;
  /** Offer a clear button (for optional dates) */
  clearable?: boolean;
}

export function DateField({ label, value, onChange, hint, minimumDate, clearable }: DateFieldProps) {
  const [iosOpen, setIosOpen] = useState(false);
  const date = value ? parseIso(value) : new Date();
  const min = minimumDate ? parseIso(minimumDate) : undefined;

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date, mode: 'date', minimumDate: min,
        onChange: (event, picked) => { if (event.type === 'set' && picked) onChange(localIso(picked)); },
      });
    } else {
      setIosOpen(o => !o);
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={open} style={styles.box} accessibilityRole="button" accessibilityLabel={`${label}: ${value ? formatDate(value) : 'not set'}`}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSubtle} />
        <Text style={[styles.value, !value && styles.placeholder]}>{value ? formatDate(value) : 'Select date'}</Text>
        {clearable && value ? (
          <Pressable onPress={() => onChange('')} hitSlop={10} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={18} color={colors.textSubtle} />
          </Pressable>
        ) : null}
      </Pressable>
      {iosOpen ? (
        <DateTimePicker value={date} mode="date" display="inline" minimumDate={min}
          onChange={(_e, picked) => { if (picked) onChange(localIso(picked)); }} />
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  box:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  value: { flex: 1, fontSize: 16, color: colors.text },
  placeholder: { color: colors.textSubtle },
  hint:  { fontSize: 12, color: colors.textMuted },
});
