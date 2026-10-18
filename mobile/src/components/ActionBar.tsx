import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export interface Action { label: string; icon: IconName; onPress: () => void; primary?: boolean; disabled?: boolean }

// Row of page actions (the web's toolbar buttons)
export function ActionBar({ actions }: { actions: Action[] }) {
  return (
    <View style={styles.bar}>
      {actions.map(a => (
        <Pressable key={a.label} onPress={a.onPress} disabled={a.disabled} accessibilityRole="button"
          style={({ pressed }) => [styles.btn, a.primary && styles.primary, pressed && styles.pressed, a.disabled && styles.disabled]}>
          <Ionicons name={a.icon} size={16} color={a.primary ? colors.white : colors.primary} />
          <Text style={[styles.label, a.primary && styles.primaryLabel]}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Icon button for a screen header (headerRight) */
export function HeaderButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.header} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={26} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar:     { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, minHeight: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: colors.primarySoft },
  primary: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
  label:   { fontSize: 14, fontWeight: '600', color: colors.primary },
  primaryLabel: { color: colors.white },
  header:  { paddingHorizontal: spacing.xs },
});
