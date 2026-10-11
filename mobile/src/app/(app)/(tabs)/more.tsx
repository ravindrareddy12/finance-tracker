import React from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '@/auth/AuthProvider';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { ListRow } from '@/components/ListRow';
import { Button } from '@/components/Button';
import { isModuleEnabled, usePortfolio } from '@/features/portfolio/usePortfolio';
import { PRIVACY_POLICY_URL, WEBSITE_URL } from '@/config/env';
import { formatDate, money } from '@/lib/format';
import { colors, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export default function MoreScreen() {
  const { user, signOut } = useAuth();
  const { summary, userData, isRefreshing, refresh } = usePortfolio();
  const cat = Object.fromEntries(summary.categories.map(c => [c.key, c]));

  const modules: { module: string; title: string; subtitle: string; icon: IconName; href: Href }[] = [
    { module: 'realestate', title: 'Real Estate', subtitle: `${cat.re.count} · ${money(cat.re.current)}`, icon: 'business-outline', href: '/real-estate' },
    { module: 'loans', title: 'Interest Investments', subtitle: `${cat.loans.count} · ${money(cat.loans.current)} outstanding`, icon: 'cash-outline', href: '/loans' },
    { module: 'additional', title: 'Additional Investments', subtitle: `${cat.addl.count} · ${money(cat.addl.current)}`, icon: 'wallet-outline', href: '/investments' },
    { module: 'fire', title: 'FIRE Calculator', subtitle: 'Your number and the savings path', icon: 'flame-outline', href: '/fire' },
    { module: 'expenses', title: 'Monthly Expenses', subtitle: 'Obligations by month', icon: 'receipt-outline', href: '/expenses' },
  ];
  const visible = modules.filter(m => isModuleEnabled(userData.config, m.module));

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You will need to sign in again to see your portfolio.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut('user') },
    ]);

  const leading = (name: IconName) => (
    <View style={styles.iconWrap}><Ionicons name={name} size={18} color={colors.primary} /></View>
  );

  return (
    <Screen refreshing={isRefreshing} onRefresh={refresh}>
      <Card title="Portfolio" padded={false}>
        {visible.map((m, i) => (
          <ListRow key={m.module} last={i === visible.length - 1} title={m.title} subtitle={m.subtitle}
            leading={leading(m.icon)} onPress={() => router.push(m.href)} />
        ))}
      </Card>

      <Card title="Settings" padded={false}>
        <ListRow title="Configuration" subtitle="Account holders and visible tabs" leading={leading('settings-outline')}
          onPress={() => router.push('/configuration')} last />
      </Card>

      <Card title="Account" padded={false}>
        <ListRow title={user?.username ?? ''} subtitle="Signed in" leading={leading('person-outline')} />
        <ListRow title="Last synced" value={formatDate(userData.savedAt)} leading={leading('cloud-done-outline')} />
        <ListRow title="Open website" subtitle="Add or edit data on the web" leading={leading('globe-outline')}
          onPress={() => Linking.openURL(WEBSITE_URL)} />
        <ListRow title="Privacy policy" leading={leading('shield-checkmark-outline')}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} />
        <ListRow title="Delete account" subtitle="Permanently delete your account and data" leading={leading('trash-outline')}
          onPress={() => router.push('/delete-account')} last />
      </Card>

      <View style={styles.signOut}>
        <Button title="Sign out" variant="danger" onPress={confirmSignOut} />
      </View>
      <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  signOut:  { marginTop: spacing.sm },
  version:  { textAlign: 'center', fontSize: 12, color: colors.textSubtle },
});
