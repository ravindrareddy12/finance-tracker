import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry transient failures only — never auth or validation errors
      retry: (failureCount, error) =>
        failureCount < 2 && error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server'),
      refetchOnReconnect: true,
    },
  },
});

// Treat returning to the app as "focus", so stale data (e.g. edits made on the
// website meanwhile) is refetched when the app is reopened.
if (Platform.OS !== 'web') {
  focusManager.setEventListener(handleFocus => {
    const sub = AppState.addEventListener('change', state => handleFocus(state === 'active'));
    return () => sub.remove();
  });
}
