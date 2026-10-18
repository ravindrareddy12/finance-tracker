import React, { type PropsWithChildren, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '@/theme';

interface SheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Buttons pinned below the scrolling form */
  footer?: ReactNode;
}

// Full-height modal form: header with close, scrolling body, pinned footer
export function Sheet({ visible, title, subtitle, onClose, footer, children }: PropsWithChildren<SheetProps>) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
          <KeyboardAvoidingView style={styles.root} behavior="padding">
            <View style={styles.header}>
              <View style={styles.titles}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                {subtitle ? <Text style={font.caption} numberOfLines={1}>{subtitle}</Text> : null}
              </View>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={styles.root} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

/** Footer buttons side by side */
export function SheetActions({ children }: PropsWithChildren) {
  return (
    <View style={styles.actions}>
      {React.Children.map(children, child => (child ? <View style={styles.action}>{child}</View> : null))}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  titles:  { flex: 1, gap: 2 },
  title:   { fontSize: 17, fontWeight: '700', color: colors.text },
  body:    { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  footer:  { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actions: { flexDirection: 'row', gap: spacing.md },
  action:  { flex: 1 },
});
