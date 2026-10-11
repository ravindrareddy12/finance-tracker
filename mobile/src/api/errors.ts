import { isAxiosError } from 'axios';

export type ApiErrorKind = 'network' | 'timeout' | 'unauthorized' | 'rateLimited' | 'validation' | 'server';

// Every failed request is normalised to this, so screens never inspect axios internals.
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') return new ApiError('The server took too long to respond. Please try again.', 'timeout');
    if (!err.response) return new ApiError('No internet connection, or the server is unreachable.', 'network');
    const status = err.response.status;
    const serverMessage = (err.response.data as { error?: string } | undefined)?.error;
    if (status === 401) return new ApiError(serverMessage ?? 'Please sign in again.', 'unauthorized', status);
    if (status === 429) return new ApiError(serverMessage ?? 'Too many attempts. Please wait and try again.', 'rateLimited', status);
    if (status >= 400 && status < 500) return new ApiError(serverMessage ?? 'Please check your details and try again.', 'validation', status);
    return new ApiError(serverMessage ?? 'Something went wrong on the server. Please try again.', 'server', status);
  }
  return new ApiError('Something went wrong. Please try again.', 'server');
}
