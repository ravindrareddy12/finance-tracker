import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { ApiError } from '@/api/errors';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [username, setUsername] = useState('');
  const [hint, setHint] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    if (!username.trim() || !hint.trim()) { setError('Enter your username and password hint.'); return; }
    if (password.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await resetPassword(username, hint, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Password Reset" subtitle="You can now sign in with your new password">
        <Banner tone="positive" message="Your password has been changed." />
        <Button title="Back to Sign In" onPress={() => router.replace('/sign-in')} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Verify it's you with the password hint you set">
      {error ? <Banner tone="negative" message={error} /> : null}
      <TextField label="Username" icon="person-outline" placeholder="Your username" value={username} onChangeText={setUsername} />
      <TextField label="Password Hint" icon="help-circle-outline" placeholder="The hint you set at sign up" value={hint} onChangeText={setHint} />
      <TextField label="New Password" icon="lock-closed-outline" placeholder="Min. 6 characters" secure value={password} onChangeText={setPassword} />
      <TextField label="Confirm New Password" icon="lock-closed-outline" placeholder="Re-enter new password" secure value={confirm} onChangeText={setConfirm}
        returnKeyType="go" onSubmitEditing={submit} />
      <Button title="Reset Password" onPress={submit} loading={submitting} />
      <Link href="/sign-in" style={styles.back}>Back to Sign In</Link>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontWeight: '600', fontSize: 14, textAlign: 'center' },
});
