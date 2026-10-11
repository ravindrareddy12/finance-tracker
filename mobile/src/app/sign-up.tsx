import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import * as Linking from 'expo-linking';
import { PRIVACY_POLICY_URL } from '@/config/env';
import { useAuth } from '@/auth/AuthProvider';
import { ApiError } from '@/api/errors';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme';

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,40}$/;

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [hint, setHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const hintRef = useRef<TextInput>(null);

  const submit = async () => {
    setError(null);
    if (!USERNAME_PATTERN.test(username.trim())) { setError('Username must be 3–40 characters: letters, numbers, . _ -'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      await signUp(username, password, hint);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign up failed. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Start tracking your investments">
      {error ? <Banner tone="negative" message={error} /> : null}

      <TextField label="Username" icon="person-outline" placeholder="Choose a username"
        value={username} onChangeText={setUsername} autoComplete="username-new"
        returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <TextField ref={passwordRef} label="Password" icon="lock-closed-outline" placeholder="Min. 6 characters" secure
        value={password} onChangeText={setPassword} autoComplete="password-new" textContentType="newPassword"
        returnKeyType="next" onSubmitEditing={() => confirmRef.current?.focus()} />
      <TextField ref={confirmRef} label="Confirm Password" icon="lock-closed-outline" placeholder="Re-enter password" secure
        value={confirm} onChangeText={setConfirm} returnKeyType="next" onSubmitEditing={() => hintRef.current?.focus()} />
      <TextField ref={hintRef} label="Password Hint (optional)" icon="help-circle-outline" placeholder="Used to reset your password"
        hint="You'll need this hint to reset a forgotten password." value={hint} onChangeText={setHint}
        returnKeyType="go" onSubmitEditing={submit} />

      <Button title="Create Account" onPress={submit} loading={submitting} />

      <Text style={styles.legal}>
        By creating an account you agree to our{' '}
        <Text style={styles.footerLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>Privacy Policy</Text>.
      </Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/sign-in" style={styles.footerLink}>Sign in</Link>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footer:     { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: colors.textMuted, fontSize: 14 },
  footerLink: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  legal:      { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
});
