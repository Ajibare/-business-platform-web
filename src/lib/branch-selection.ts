/**
 * The branch the interface is currently working in.
 *
 * The value is only ever a request: the API validates it against the branches
 * the member may reach and answers with the branch it actually used. Storing it
 * here means every request from every page carries the same choice.
 */
export const ACTIVE_BRANCH_KEY = 'activeBranchId';

/** The value that asks for every branch at once. */
export const ALL_BRANCHES = 'all';

export const BRANCH_CHANGED_EVENT = 'psi:branch-changed';

export function readActiveBranch(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_BRANCH_KEY);
}

/** Returns the header value to send, or null when nothing was chosen. */
export function branchHeader(): string | null {
  const value = readActiveBranch();
  return value && value.trim() ? value.trim() : null;
}

export function writeActiveBranch(value: string | null): void {
  if (typeof window === 'undefined') return;
  if (value) window.localStorage.setItem(ACTIVE_BRANCH_KEY, value);
  else window.localStorage.removeItem(ACTIVE_BRANCH_KEY);
  window.dispatchEvent(new Event(BRANCH_CHANGED_EVENT));
}

export function clearActiveBranch(): void {
  writeActiveBranch(null);
}
