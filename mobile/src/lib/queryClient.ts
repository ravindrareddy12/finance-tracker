import { QueryClient } from '@tanstack/react-query';
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
