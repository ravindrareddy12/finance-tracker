import React, { type PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, font, radius, spacing } from '@/theme';

interface CardProps {
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

export function Card({ title, subtitle, style, padded = true, children }: PropsWithChildren<CardProps>) {
  return (
    <View style={[styles.card, padded && styles.padded, style]}>
      {title ? (
        <View style={[styles.header, !padded && styles.headerUnpadded]}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={font.caption}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  padded: { padding: spacing.lg },
  header: { marginBottom: spacing.md, gap: 2 },
  headerUnpadded: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title:  { fontSize: 16, fontWeight: '600', color: colors.text },
});
