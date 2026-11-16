/**
 * Remembers that the expiry alert has been shown for the current sign-in.
 *
 * `sessionStorage` is per browser tab and survives client side navigation, so
 * the popup appears once per login session rather than on every page change.
 * Sign-out clears it, and a new browser session starts empty again.
 */
const STORAGE_PREFIX = 'psi:expiry-alert:';

export function hasSeenExpiryAlert(organizationId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}${organizationId}`) !== null;
  } catch {
    // Storage can be blocked; never block the app because of it.
    return true;
  }
}

export function markExpiryAlertSeen(organizationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${organizationId}`, new Date().toISOString());
  } catch {
    // Ignore: the popup simply shows again next navigation.
  }
}

/** Called on sign-out so the next sign-in shows the alert again. */
export function clearExpiryAlertHints(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}
