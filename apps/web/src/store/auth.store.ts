import { create } from 'zustand';
import type { AuthUserPublic } from '@usd/shared-types';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUserPublic | null;
  setSession: (accessToken: string, refreshToken: string, user: AuthUserPublic) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
};

/**
 * Client-side auth session (access + refresh + public user profile).
 */
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setSession: (accessToken, refreshToken, user) => {
    set({ accessToken, refreshToken, user });
  },
  updateTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
  },
  clear: () => {
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
