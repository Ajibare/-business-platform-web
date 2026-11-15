'use client';

import { useCallback, useEffect, useState } from 'react';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    accessToken: null,
    refreshToken: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuth({
      accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
      refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
    });
    setIsLoading(false);
  }, []);

  const signIn = useCallback((tokens: { accessToken: string; refreshToken: string }) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    setAuth({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAuth({ accessToken: null, refreshToken: null });
  }, []);

  return { ...auth, isLoading, signIn, signOut };
}
