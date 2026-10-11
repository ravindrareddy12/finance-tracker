import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import { ApiError } from '@/api/errors';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme';

const REASON_MESSAGE = {
  expired: 'Your session expired. Please sign in again.',
  revoked: 'You were signed out. Please sign in again.',
  deleted: 'Your account and all of its data have been deleted.',
} as const;

export default function SignInScreen() {
  const { signIn, signOutReason } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setError(null);
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setSubmitting(true);
    try {
      await signIn(username, password); // navigation follows the auth guard
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.');
      setSubmitting(false);
    }
  };

  const notice = signOutReason && signOutReason !== 'user' ? REASON_MESSAGE[signOutReason] : null;

  return (
    <AuthLayout title="Finance Tracker" subtitle="Sign in to your account">
      {notice && !error ? <Banner tone={signOutReason === 'deleted' ? 'positive' : 'warning'} message={notice} /> : null}
      {error ? <Banner tone="negative" message={error} /> : null}

      <TextField label="Username" icon="person-outline" placeholder="Enter username"
        value={username} onChangeText={setUsername} textContentType="username" autoComplete="username"
        returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />

      <TextField ref={passwordRef} label="Password" icon="lock-closed-outline" placeholder="Enter password" secure
        value={password} onChangeText={setPassword} textContentType="password" autoComplete="password"
        returnKeyType="go" onSubmitEditing={submit} />

      <Link href="/forgot-password" style={styles.link}>Forgot password?</Link>

      <Button title="Sign In" onPress={submit} loading={submitting} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{"Don't have an account? "}</Text>
        <Link href="/sign-up" style={styles.footerLink}>Sign up</Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link:       { color: colors.primary, fontWeight: '600', fontSize: 14, alignSelf: 'flex-end' },
  footer:     { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: colors.textMuted, fontSize: 14 },
  footerLink: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});
