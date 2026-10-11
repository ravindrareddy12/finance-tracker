import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Banner } from '@/components/Banner';
import { useSaveUserData, useUserData } from '@/features/portfolio/usePortfolio';
import { MODULES, accountColor, normalizeConfig, type ModuleMeta } from '@/features/config/modules';
import { colors, radius, spacing } from '@/theme';
import type { AppConfig } from '@/types/models';

export default function ConfigurationScreen() {
  const { userData, isLoading, isRefetching, refetch } = useUserData();
  const save = useSaveUserData();
  const config = normalizeConfig(userData.config);
  const { dematAccounts, enabledTabs } = config;

  const [newAccount, setNewAccount] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const persist = (next: AppConfig) => save.mutate({ name: 'app_config', value: next });

  // Same rules as the web: trimmed, non-empty, no duplicates
  const addAccount = () => {
    const name = newAccount.trim();
    if (!name || dematAccounts.includes(name)) return;
    persist({ ...config, dematAccounts: [...dematAccounts, name] });
    setNewAccount('');
  };

  const commitRename = () => {
    const name = editValue.trim();
    if (editing && name && name !== editing && !dematAccounts.includes(name)) {
      persist({ ...config, dematAccounts: dematAccounts.map(a => (a === editing ? name : a)) });
    }
    setEditing(null);
  };

  const removeAccount = (name: string) =>
    Alert.alert(`Remove ${name}?`, 'The name is removed from account filters. Existing transactions keep it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => persist({ ...config, dematAccounts: dematAccounts.filter(a => a !== name) }) },
    ]);

  const setTabEnabled = (id: string, enabled: boolean) =>
    persist({ ...config, enabledTabs: { ...enabledTabs, [id]: enabled } });

  const sections = useMemo(() => MODULES.reduce<Record<string, ModuleMeta[]>>((acc, m) => {
    (acc[m.section] ??= []).push(m);
    return acc;
  }, {}), []);

  const duplicate = dematAccounts.includes(newAccount.trim());

  return (
    <Screen loading={isLoading} refreshing={isRefetching} onRefresh={refetch}>
      {save.isError ? <Banner tone="negative" message={`Couldn't save: ${save.error.message}`} /> : null}

      <Card title="Demat Account Holders" subtitle="Names appear in account filters across all tabs." padded={false}>
        {dematAccounts.length === 0 ? (
          <Text style={styles.empty}>No accounts yet. Add your first account holder below.</Text>
        ) : dematAccounts.map((acct, idx) => (
          <View key={acct} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: accountColor(idx) }]}><Text style={styles.dotText}>{idx + 1}</Text></View>
            {editing === acct ? (
              <TextInput value={editValue} onChangeText={setEditValue} autoFocus style={[styles.input, styles.flex]}
                onSubmitEditing={commitRename} returnKeyType="done" autoCapitalize="words" />
            ) : (
              <Text style={[styles.name, styles.flex]} numberOfLines={1}>{acct}</Text>
            )}
            {editing === acct ? (
              <>
                <IconButton name="checkmark" color={colors.positive} label="Save name" onPress={commitRename} />
                <IconButton name="close" color={colors.textMuted} label="Cancel" onPress={() => setEditing(null)} />
              </>
            ) : (
              <>
                <IconButton name="pencil-outline" color={colors.textMuted} label={`Rename ${acct}`} onPress={() => { setEditing(acct); setEditValue(acct); }} />
                <IconButton name="trash-outline" color={colors.negative} label={`Remove ${acct}`} onPress={() => removeAccount(acct)} />
              </>
            )}
          </View>
        ))}
        <View style={[styles.row, styles.addRow]}>
          <TextInput value={newAccount} onChangeText={setNewAccount} placeholder="New account holder name…"
            placeholderTextColor={colors.textSubtle} style={[styles.input, styles.flex]}
            onSubmitEditing={addAccount} returnKeyType="done" autoCapitalize="words" />
          <Pressable onPress={addAccount} disabled={!newAccount.trim() || duplicate}
            style={({ pressed }) => [styles.addBtn, (!newAccount.trim() || duplicate) && styles.disabled, pressed && styles.pressed]}
            accessibilityRole="button" accessibilityLabel="Add account holder">
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
      </Card>

      <Card title="Tab Visibility" subtitle="Disabled tabs are hidden on the website and in this app. Dashboard and Configuration are always visible." padded={false}>
        <View style={styles.alwaysOn}>
          {['Dashboard', 'Configuration'].map(label => (
            <View key={label} style={styles.pill}><Text style={styles.pillText}>{label}</Text><Text style={styles.pillSub}>always on</Text></View>
          ))}
        </View>
        {Object.entries(sections).map(([section, mods]) => (
          <View key={section}>
            <Text style={styles.section}>{section}</Text>
            {mods.map(m => {
              const on = enabledTabs[m.id] !== false;
              return (
                <View key={m.id} style={styles.row}>
                  <Ionicons name={m.icon} size={18} color={on ? colors.textMuted : colors.textSubtle} />
                  <Text style={[styles.name, styles.flex, !on && { color: colors.textSubtle }]}>{m.label}</Text>
                  <Switch value={on} onValueChange={v => setTabEnabled(m.id, v)}
                    trackColor={{ true: colors.primary, false: '#E5E7EB' }} thumbColor={colors.white}
                    accessibilityLabel={`Show ${m.label}`} />
                </View>
              );
            })}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function IconButton({ name, color, label, onPress }: { name: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={name} size={18} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  row:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addRow:   { paddingVertical: spacing.md },
  dot:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dotText:  { color: colors.white, fontWeight: '700', fontSize: 12 },
  name:     { fontSize: 15, fontWeight: '500', color: colors.text },
  input:    { minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: 15, color: colors.text },
  iconBtn:  { padding: 6 },
  addBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: spacing.md, minHeight: 42 },
  addText:  { color: colors.white, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  pressed:  { opacity: 0.85 },
  empty:    { textAlign: 'center', color: colors.textSubtle, fontStyle: 'italic', padding: spacing.xl },
  alwaysOn: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  pillText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  pillSub:  { color: '#60A5FA', fontSize: 11 },
  section:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textSubtle, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
});
