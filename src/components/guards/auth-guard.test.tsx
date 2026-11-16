import { render, screen } from '@testing-library/react';
import { AuthGuard } from './auth-guard';
import { useAuth } from '@/hooks/use-auth';

const replace = jest.fn();
const signOut = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/dashboard',
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = useAuth as jest.Mock;

/** Shape `useAuth` returns in the cases this guard cares about. */
function authState(overrides: Record<string, unknown>) {
  return {
    accessToken: null,
    profile: null,
    role: null,
    isLoading: false,
    signOut,
    ...overrides,
  };
}

function ownerProfile(requiresSetup: boolean) {
  return {
    user: { id: 'u1', name: 'Ada', email: 'ada@pharmacy.com', phone: null, status: 'ACTIVE' },
    organisation: { id: 'o1', name: 'Ada Pharmacy' },
    membership: { role: 'OWNER', active: true },
    onboarding: { requiresSetup, allTasksDone: !requiresSetup, checklist: [] },
    nextPath: requiresSetup ? '/onboarding/pharmacy-setup' : '/dashboard',
  };
}

describe('AuthGuard', () => {
  beforeEach(() => {
    replace.mockClear();
    signOut.mockClear();
    window.history.replaceState({}, '', '/');
  });

  it('sends an unauthenticated visitor to sign-in with the current path', () => {
    useAuthMock.mockReturnValue(authState({}));

    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>,
    );

    expect(replace).toHaveBeenCalledWith('/sign-in?next=%2Fdashboard');
    expect(screen.queryByText('secret')).toBeNull();
  });

  it('renders children when authenticated', () => {
    useAuthMock.mockReturnValue(authState({ accessToken: 'token', role: 'MANAGER' }));

    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>,
    );

    expect(screen.getByText('secret')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders a loading state while auth is resolving', () => {
    useAuthMock.mockReturnValue(authState({ isLoading: true }));

    const { container } = render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>,
    );

    expect(container.textContent).not.toContain('secret');
    expect(replace).not.toHaveBeenCalled();
  });

  it('sends an Owner with unfinished setup back to the wizard', () => {
    useAuthMock.mockReturnValue(
      authState({
        accessToken: 'token',
        role: 'OWNER',
        profile: ownerProfile(true),
      }),
    );

    render(
      <AuthGuard>
        <div>dashboard</div>
      </AuthGuard>,
    );

    expect(replace).toHaveBeenCalledWith('/onboarding/pharmacy-setup');
    expect(screen.queryByText('dashboard')).toBeNull();
  });

  it('lets an Owner with unfinished setup into the onboarding route itself', () => {
    useAuthMock.mockReturnValue(
      authState({
        accessToken: 'token',
        role: 'OWNER',
        profile: ownerProfile(true),
      }),
    );

    render(
      <AuthGuard requireOnboardingComplete={false}>
        <div>wizard</div>
      </AuthGuard>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('wizard')).toBeTruthy();
  });

  it('does not route invited staff into the Owner-only wizard', () => {
    useAuthMock.mockReturnValue(
      authState({
        accessToken: 'token',
        role: 'INVENTORY_STAFF',
        profile: ownerProfile(true),
      }),
    );

    render(
      <AuthGuard>
        <div>dashboard</div>
      </AuthGuard>,
    );

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('dashboard')).toBeTruthy();
  });

  it('keeps the query string when sending a visitor to sign-in', () => {
    useAuthMock.mockReturnValue(authState({}));
    window.history.replaceState({}, '', '/dashboard?tab=expiry');

    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>,
    );

    expect(replace).toHaveBeenCalledWith('/sign-in?next=%2Fdashboard%3Ftab%3Dexpiry');
  });

  it('ends the session of a deactivated account instead of rendering the shell', () => {
    const profile = ownerProfile(false);
    profile.user.status = 'DEACTIVATED';
    useAuthMock.mockReturnValue(
      authState({ accessToken: 'token', role: 'OWNER', profile }),
    );

    render(
      <AuthGuard>
        <div>dashboard</div>
      </AuthGuard>,
    );

    expect(signOut).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/sign-in');
    expect(screen.queryByText('dashboard')).toBeNull();
  });

  it('treats a membership that is no longer active as no access', () => {
    const profile = ownerProfile(false);
    profile.membership.active = false;
    useAuthMock.mockReturnValue(
      authState({ accessToken: 'token', role: 'OWNER', profile }),
    );

    render(
      <AuthGuard>
        <div>dashboard</div>
      </AuthGuard>,
    );

    expect(signOut).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/sign-in');
    expect(screen.queryByText('dashboard')).toBeNull();
  });
});
