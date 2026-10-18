import { Alert } from 'react-native';

/** Parse a typed number ('' or invalid → NaN). Commas are ignored. */
export const parseNum = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(/,/g, '')));

/** Ask before a destructive action. */
export function confirmDestructive(title: string, message: string, action: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}
