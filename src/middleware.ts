import { NextResponse, type NextRequest } from 'next/server';
import { decideRoute } from '@/lib/route-guard';
import { SESSION_HINT_COOKIE } from '@/lib/session-hint';

/**
 * Server-side routing for the first request of a page load: opening `/` sends a
 * new visitor to registration, and a protected URL sends a visitor with no
 * session to sign-in before anything is rendered or hydrated.
 *
 * The decision is coarse on purpose. Middleware cannot validate a session — the
 * refresh token never reaches this origin — so it only reads the hint cookie
 * described in `lib/session-hint.ts`; `AuthGuard` remains the authority on
 * whether a session is real and where a signed-in user belongs.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_HINT_COOKIE)?.value);

  const decision = decideRoute(pathname, hasSession, search);

  if (decision.kind === 'redirect') {
    return NextResponse.redirect(new URL(decision.path, request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Pages only. Static files, the image optimiser and the build manifest are
   * skipped: they are not routes, and redirecting them would break rendering.
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
};
