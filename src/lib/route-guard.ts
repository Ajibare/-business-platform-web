/**
 * Where a request should go, decided from the URL and one bit of session state.
 *
 * Kept out of `middleware.ts` so the rules can be tested without the edge
 * runtime. Middleware is the first hop only: it decides whether a visitor is
 * *known* to have a session, and `AuthGuard` decides *where* a signed-in user
 * belongs once the API has answered. That split keeps the routing table in one
 * place and means an incorrect hint costs a redirect, never access.
 */

/** Where a visitor starts when they open the application. */
export const REGISTRATION_ENTRY = '/sign-up';

/** Where a signed-in user lands; `AuthGuard` refines this for an unfinished setup. */
export const APP_HOME = '/dashboard';

export const SIGN_IN = '/sign-in';

/**
 * Pages that must stay reachable without a session. Everything not listed is
 * treated as protected, so a new screen is private by default rather than
 * accidentally public.
 */
const PUBLIC_ROUTES: readonly string[] = [
  '/sign-up',
  '/sign-in',
  '/verify-contact',
  '/forgot-password',
  '/reset-password',
  '/invite',
];

/** Public, but with a token in the path. */
const PUBLIC_PREFIXES: readonly string[] = ['/invite/'];

export type RouteDecision =
  /** Render the requested page. */
  | { kind: 'continue' }
  /** Send the browser elsewhere before anything renders. */
  | { kind: 'redirect'; path: string };

/** `/sign-in/` and `/sign-in` are the same page as far as these rules care. */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function isPublic(pathname: string): boolean {
  return (
    PUBLIC_ROUTES.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export function decideRoute(
  pathname: string,
  hasSession: boolean,
  search = '',
): RouteDecision {
  const path = normalize(pathname);

  // The application starts at registration for anyone we have no session for.
  if (path === '/') {
    return { kind: 'redirect', path: hasSession ? APP_HOME : REGISTRATION_ENTRY };
  }

  // Legacy route kept alive by `(auth)/login/page.tsx`.
  if (path === '/login') {
    return { kind: 'redirect', path: hasSession ? APP_HOME : SIGN_IN };
  }

  if (isPublic(path)) return { kind: 'continue' };

  if (hasSession) return { kind: 'continue' };

  // `next` keeps the query string, so a filtered list reopens filtered once the
  // person signs in. It is always a same-origin path, never a full URL.
  return { kind: 'redirect', path: `${SIGN_IN}?next=${encodeURIComponent(path + search)}` };
}
