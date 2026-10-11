import * as SecureStore from 'expo-secure-store';
import type { SessionUser } from '@/types/models';

// Persisted in the Android Keystore / iOS Keychain. Keys: [A-Za-z0-9._-] only.
const TOKEN_KEY = 'ft.auth.token';
const USER_KEY  = 'ft.auth.user';

export interface StoredSession {
  token: string;
  user: SessionUser;
}

export const tokenStorage = {
  async load(): Promise<StoredSession | null> {
    try {
      const [token, user] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (!token || !user) return null;
      return { token, user: JSON.parse(user) as SessionUser };
    } catch {
      // Corrupt or unreadable entry (e.g. after a Keystore reset) — treat as signed out
      await this.clear();
      return null;
    }
  },

  async save({ token, user }: StoredSession): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
    ]);
  },
};
