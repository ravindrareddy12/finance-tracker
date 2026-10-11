import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/auth/AuthProvider';
import { ApiError } from '@/api/errors';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors, spacing } from '@/theme';

const DELETED_ITEMS = [
  'Your account: username, password and password hint',
  'Stock transactions and cash balances',
  'Mutual funds and SIP schedules',
  'Real estate, loans and other investments',
  'Monthly expenses, FIRE inputs and settings',
];

export default function DeleteAccountScreen() {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const run = async () => {
    setSubmitting(true);
    try {
      await deleteAccount(password); // signs out on success; the auth guard returns to sign-in
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the account. Please try again.');
      setSubmitting(false);
    }
  };

  const submit = () => {
    setError(null);
    if (!password) { setError('Enter your password to confirm.'); return; }
    if (!confirmed) { setError('Please confirm that you understand this cannot be undone.'); return; }
    Alert.alert('Delete account permanently?', `The account "${user?.username}" and all of its data will be deleted. This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <Banner tone="negative" message="Deleting your account is permanent and cannot be undone." />

      <Card title="What will be deleted">
        <View style={styles.list}>
          {DELETED_ITEMS.map(item => (
            <View key={item} style={styles.item}>
              <Ionicons name="trash-outline" size={16} color={colors.negative} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.note}>Want a copy first? Sign in on the website and use Export Excel.</Text>
      </Card>

      <Card title="Confirm with your password">
        <View style={styles.form}>
          {error ? <Banner tone="negative" message={error} /> : null}
          <TextField label={`Password for ${user?.username ?? ''}`} icon="lock-closed-outline" secure
            value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" />
          <Pressable style={styles.check} onPress={() => setConfirmed(c => !c)}
            accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }}>
            <Ionicons name={confirmed ? 'checkbox' : 'square-outline'} size={22} color={confirmed ? colors.negative : colors.textMuted} />
            <Text style={styles.checkText}>I understand my account and all of its data will be permanently deleted.</Text>
          </Pressable>
          <Button title="Delete my account" variant="danger" onPress={submit} loading={submitting} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list:      { gap: spacing.sm },
  item:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemText:  { flex: 1, fontSize: 14, color: colors.text },
  note:      { marginTop: spacing.md, fontSize: 13, color: colors.textMuted },
  form:      { gap: spacing.lg },
  check:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkText: { flex: 1, fontSize: 14, color: colors.text },
});
