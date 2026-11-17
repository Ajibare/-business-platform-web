'use client';

import { useCallback } from 'react';
import { useAuth } from './use-auth';

/**
 * The permissions the API granted this member.
 *
 * This decides what the interface *offers*, never what it allows: every screen
 * that hides a control here is still refused by the API when the same call is
 * made with insufficient permission. Keys come from the permission catalogue,
 * never from a role name.
 */
export function usePermissions() {
  const { profile } = useAuth();
  const permissions = profile?.permissions ?? [];

  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions],
  );

  /** True when the member holds at least one of the keys. */
  const canAny = useCallback(
    (keys: string[]) => keys.some((key) => permissions.includes(key)),
    [permissions],
  );

  return { permissions, can, canAny };
}
