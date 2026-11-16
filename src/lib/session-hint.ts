/**
 * A routing hint, not a credential.
 *
 * The API keeps its refresh token in an HttpOnly cookie scoped to
 * `/api/v1/auth`, so no page request ever carries it. Middleware therefore has
 * no way to ask "does this browser have a session?" on the server, and asking
 * the client to answer from `localStorage` is exactly what the brief rules out.
 *
 * This cookie answers only that one question, and only to the router: it says
 * "this browser signed in recently, so let it load the app shell instead of
 * sending it to sign-up". It is set from a server response (a successful
 * sign-in, verification, invitation acceptance or `/auth/me`), never from user
 * input, and it grants nothing: every screen still calls the API with the
 * access token, and `AuthGuard` still ends the session when that fails. A
 * forged value at worst costs a round trip to `/sign-in`.
 *
 * It has to be readable by JavaScript to be written at all, which is why it
 * holds no secret.
 */
export const SESSION_HINT_COOKIE = 'psi_session';

/** Matches the refresh token lifetime, so the hint cannot outlive the session. */
const HINT_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const entry = part.trim();
    if (entry.startsWith(prefix)) return decodeURIComponent(entry.slice(prefix.length));
  }
  return null;
}

function writeAttribute(value: string, maxAge: number): string {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_HINT_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function hasSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return readCookie(SESSION_HINT_COOKIE) === '1';
}

/** Called whenever the client receives a working session. */
export function markSessionActive(): void {
  if (typeof document === 'undefined') return;
  document.cookie = writeAttribute('1', HINT_MAX_AGE_SECONDS);
}

/** Called on sign-out and whenever a renewal is refused. */
export function clearSessionHint(): void {
  if (typeof document === 'undefined') return;
  if (!hasSessionHint()) return;
  document.cookie = writeAttribute('', 0);
}
