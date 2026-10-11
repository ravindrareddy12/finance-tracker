import { api } from './client';
import type { SessionUser } from '@/types/models';

export interface SessionResponse {
  token: string;
  user: SessionUser;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<SessionResponse>('/auth/login', { username, password }).then(r => r.data),

  register: (username: string, password: string, passwordHint?: string) =>
    api.post<SessionResponse>('/auth/register', { username, password, passwordHint }).then(r => r.data),

  me: () => api.get<{ user: SessionUser }>('/auth/me').then(r => r.data.user),

  /** Permanently delete the signed-in account; the password is re-confirmed server-side. */
  deleteAccount: (password: string) => api.delete<{ ok: true }>('/auth/me', { data: { password } }).then(r => r.data),

  resetPassword: (username: string, passwordHint: string, newPassword: string) =>
    api.post<{ ok: true }>('/auth/reset-password', { username, passwordHint, newPassword }).then(r => r.data),
};
