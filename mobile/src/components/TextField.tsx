import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
  secure?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, icon, hint, secure, style, ...inputProps }, ref,
) {
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textSubtle} /> : null}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textSubtle}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={e => { setFocused(true); inputProps.onFocus?.(e); }}
          onBlur={e => { setFocused(false); inputProps.onBlur?.(e); }}
          {...inputProps}
        />
        {secure ? (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  box:   {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48,
    paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  boxFocused: { borderColor: colors.primary },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.sm },
  hint:  { fontSize: 12, color: colors.textMuted },
});
