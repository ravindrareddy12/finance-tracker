import React, { type PropsWithChildren, type ReactNode } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { Banner } from './Banner';

interface ScreenProps {
  loading?: boolean;
  error?: Error | null;
  refreshing?: boolean;
  onRefresh?: () => void;
  header?: ReactNode;
}

// Scrollable page body with pull-to-refresh and standard loading / error states
export function Screen({ loading, error, refreshing = false, onRefresh, header, children }: PropsWithChildren<ScreenProps>) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
    >
      {header}
      {error ? <Banner tone="negative" message={error.message} /> : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
