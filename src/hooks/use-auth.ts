'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ACCESS_TOKEN_KEY,
  PROFILE_KEY,
  SESSION_EXPIRED_EVENT,
  clearStoredSession,
  renewAccessToken,
  storeAccessToken,
} from '@/services/api';
import { authApi } from '@/services/auth';
import type { AuthProfile, AuthResult } from '@/types/auth';

/** Fired after the profile is re-fetched so every mounted hook sees the update. */
export const PROFILE_UPDATED_EVENT = 'psi:profile-updated';

export function readStoredProfile(): AuthProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthProfile;
  } catch {
    window.localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

export function storeProfile(profile: AuthProfile | null): void {
  if (typeof window === 'undefined') return;
  if (profile) window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  else window.localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

/**
 * Authentication state for the client.
 *
 * The access token is short lived and kept in local storage so a request can be
 * authorised synchronously. The refresh token is never readable here: it lives
 * in an HttpOnly cookie, and `renewAccessToken` is the only way to exchange it.
 * A stored profile makes the shell render instantly; it is always replaced by
 * `/auth/me` once the API answers.
 */
export function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const applyProfile = (next: AuthProfile | null) => {
      if (cancelled) return;
      setProfile(next);
    };

    const hydrate = async () => {
      const storedToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
      const storedProfile = readStoredProfile();

      if (!cancelled) {
        setAccessToken(storedToken);
        setProfile(storedProfile);
      }

      // A returning visitor has no access token (it expired) but still has a
      // refresh cookie. Only renew when this device was signed in before, so
      // public pages do not fire a pointless request.
      let token = storedToken;
      if (!token && storedProfile) {
        token = await renewAccessToken();
        if (!cancelled) setAccessToken(token);
      }

      if (!cancelled) setIsLoading(false);

      if (token) {
        try {
          const fresh = await authApi.me();
          storeProfile(fresh);
          applyProfile(fresh);
        } catch {
          // `apiFetch` already cleared the session when renewal failed; a
          // transient network error keeps the cached profile in place.
        }
      } else if (!storedProfile) {
        applyProfile(null);
      }
    };

    void hydrate();

    const handleExpired = () => {
      if (cancelled) return;
      setAccessToken(null);
      setProfile(null);
    };
    const handleProfileUpdate = () => {
      if (!cancelled) setProfile(readStoredProfile());
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACCESS_TOKEN_KEY) setAccessToken(event.newValue);
      if (event.key === PROFILE_KEY) setProfile(readStoredProfile());
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const applySession = useCallback((result: AuthResult) => {
    storeAccessToken(result.accessToken);
    storeProfile(result.profile);
    setAccessToken(result.accessToken);
    setProfile(result.profile);
  }, []);

  const signIn = useCallback(
    (result: AuthResult) => {
      applySession(result);
    },
    [applySession],
  );

  const refreshProfile = useCallback(async () => {
    const fresh = await authApi.me();
    storeProfile(fresh);
    setProfile(fresh);
    return fresh;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch {
      // The cookie may already be gone; signing out locally must still succeed.
    }
    clearStoredSession();
    setAccessToken(null);
    setProfile(null);
  }, []);

  const role = profile?.membership.role ?? null;
  const isOwner = role === 'OWNER';

  return {
    accessToken,
    profile,
    role,
    isOwner,
    isLoading,
    isAuthenticated: Boolean(accessToken),
    signIn,
    signOut,
    refreshProfile,
    /** Used after an invitation or onboarding step changes the membership. */
    applySession,
  };
}
