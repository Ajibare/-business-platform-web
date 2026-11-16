import { APP_HOME, REGISTRATION_ENTRY, decideRoute } from './route-guard';

/** Convenience so the table below reads like a routing table. */
function destination(pathname: string, hasSession: boolean, search = ''): string {
  const decision = decideRoute(pathname, hasSession, search);
  return decision.kind === 'redirect' ? decision.path : '<render>';
}

describe('decideRoute', () => {
  describe('the root URL', () => {
    it('sends a visitor with no session to registration', () => {
      expect(destination('/', false)).toBe(REGISTRATION_ENTRY);
      expect(REGISTRATION_ENTRY).toBe('/sign-up');
    });

    it('sends a signed-in visitor to the application', () => {
      expect(destination('/', true)).toBe(APP_HOME);
      expect(APP_HOME).toBe('/dashboard');
    });
  });

  describe('the legacy /login route', () => {
    it('forwards to sign-in when there is no session', () => {
      expect(destination('/login', false)).toBe('/sign-in');
    });

    it('forwards into the application when there is a session', () => {
      expect(destination('/login', true)).toBe('/dashboard');
    });
  });

  describe('authentication pages stay reachable', () => {
    it.each([
      '/sign-up',
      '/sign-in',
      '/verify-contact',
      '/forgot-password',
      '/reset-password',
      '/invite/3f6a1b',
      '/sign-in/',
    ])('allows %s without a session', (pathname) => {
      expect(destination(pathname, false)).toBe('<render>');
    });

    it('does not bounce a signed-in visitor off an authentication page into a loop', () => {
      // Sign-in has to stay reachable: the session hint can outlive the session,
      // and a redirect from here would fight the guard's redirect back.
      expect(destination('/sign-in', true)).toBe('<render>');
      expect(destination('/sign-up', true)).toBe('<render>');
    });
  });

  describe('protected routes', () => {
    it('sends a visitor with no session to sign-in and keeps the destination', () => {
      expect(destination('/dashboard', false)).toBe('/sign-in?next=%2Fdashboard');
    });

    it('keeps the query string in the destination', () => {
      expect(destination('/products/pharmacy/batches', false, '?page=2&sort=expiry')).toBe(
        '/sign-in?next=%2Fproducts%2Fpharmacy%2Fbatches%3Fpage%3D2%26sort%3Dexpiry',
      );
    });

    it('protects the onboarding wizard too', () => {
      expect(destination('/onboarding/pharmacy-setup', false)).toBe(
        '/sign-in?next=%2Fonboarding%2Fpharmacy-setup',
      );
    });

    it('treats an unknown route as protected rather than public', () => {
      expect(destination('/pricing', false)).toBe('/sign-in?next=%2Fpricing');
    });

    it('lets a signed-in visitor through', () => {
      expect(destination('/dashboard', true)).toBe('<render>');
      expect(destination('/products/pharmacy', true)).toBe('<render>');
      expect(destination('/onboarding/pharmacy-setup', true)).toBe('<render>');
    });
  });

  it('only ever puts a same-origin path in `next`', () => {
    const decision = decideRoute('/dashboard', false, '?tab=expiry');
    const next = new URLSearchParams(
      decision.kind === 'redirect' ? decision.path.split('?')[1] : '',
    ).get('next');

    expect(next).toBe('/dashboard?tab=expiry');
    expect(next?.startsWith('/')).toBe(true);
    expect(next?.startsWith('//')).toBe(false);
  });
});
