'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { usePermissions } from './use-permissions';
import {
  ALL_BRANCHES,
  BRANCH_CHANGED_EVENT,
  readActiveBranch,
  writeActiveBranch,
} from '@/lib/branch-selection';
import type { AuthBranch } from '@/types/auth';

/**
 * The branch the interface is working in.
 *
 * The stored value is a request: the API validates it against the member's
 * assignments and answers with the branch that was actually used. When nothing
 * is stored the member's default branch is shown, which is what keeps a
 * single-branch workspace behaving exactly as it did before.
 */
export function useBranch() {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const branches = useMemo<AuthBranch[]>(() => profile?.branches ?? [], [profile]);
  const [stored, setStored] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setStored(readActiveBranch());
    sync();
    window.addEventListener(BRANCH_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(BRANCH_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // The API only answers a consolidated request when the member may reach every
  // branch, either by permission or because they are assigned to two or more.
  const canViewAll = can('branch:all') || branches.length > 1;

  const fallback = branches.find((branch) => branch.isDefault)?.id ?? branches[0]?.id ?? null;

  const value =
    stored === ALL_BRANCHES && canViewAll
      ? ALL_BRANCHES
      : stored && branches.some((branch) => branch.id === stored)
        ? stored
        : fallback;

  const setSelection = useCallback(
    (next: string) => {
      writeActiveBranch(next || null);
      // Every cached list was fetched for the previous branch. Refetch rather
      // than repaint a stale branch's numbers under the new name.
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const activeBranch = branches.find((branch) => branch.id === value) ?? null;

  return {
    branches,
    /** The switcher's controlled value: a branch id or `all`. */
    value: value ?? '',
    activeBranch,
    activeBranchId: activeBranch?.id ?? null,
    isConsolidated: value === ALL_BRANCHES,
    canViewAll,
    /** True when there is nothing to switch between. */
    singleBranch: branches.length <= 1,
    setSelection,
  };
}
