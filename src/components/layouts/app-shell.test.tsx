import { fireEvent, render, screen, within } from '@testing-library/react';
import { AppShell } from './app-shell';
import { useAuth } from '@/hooks/use-auth';

let pathname = '/dashboard';
const push = jest.fn();
const signOut = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

// The bell polls the API and the dialog renders over the page; neither is what
// this test is about, so they are replaced rather than wired to fetch.
jest.mock('@/components/notifications/notification-bell', () => ({
  NotificationBell: () => <span data-notification-bell="true" />,
}));

jest.mock('@/features/pharmacy/expiry-alert-dialog', () => ({
  ExpiryAlertDialog: () => null,
}));

const useAuthMock = useAuth as jest.Mock;

const profile = {
  user: { id: 'u1', name: 'Ada', email: 'ada@pharmacy.com', phone: null, status: 'ACTIVE' },
  organisation: { id: 'o1', name: 'Ada Pharmacy' },
  membership: { role: 'OWNER', active: true },
  onboarding: { requiresSetup: false, allTasksDone: true, checklist: [] },
  nextPath: '/dashboard',
};

function renderAt(path: string) {
  pathname = path;
  useAuthMock.mockReturnValue({
    accessToken: 'token',
    profile,
    role: 'OWNER',
    isLoading: false,
    signOut,
  });
  return render(
    <AppShell>
      <p>page body</p>
    </AppShell>,
  );
}

/** The desktop sidebar, so link names are not confused with the bottom bar. */
function sidebar() {
  const aside = document.querySelector('aside');
  if (!aside) throw new Error('the sidebar did not render');
  return within(aside);
}

/** The sticky top bar. */
function header() {
  const element = document.querySelector('header');
  if (!element) throw new Error('the header did not render');
  return element;
}

describe('AppShell', () => {
  beforeEach(() => {
    push.mockClear();
    signOut.mockClear();
    useAuthMock.mockReset();
  });

  it('renders the shared chrome around the page', () => {
    renderAt('/dashboard');

    expect(screen.getByText('page body')).toBeInTheDocument();
    expect(within(header()).getByText('Ada Pharmacy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    expect(document.querySelector('[data-notification-bell]')).not.toBeNull();
  });

  it('lists every sidebar destination', () => {
    renderAt('/dashboard');

    for (const label of [
      'Dashboard',
      'Expiry monitoring',
      'Notifications',
      'Add medicines',
      'Record sale',
      'Scan product',
      'Stock batches',
      'Stock movements',
      'Stock receipts',
      'Suppliers',
      'Stock counts',
      'Bulk import',
      'Reports',
    ]) {
      expect(sidebar().getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('highlights only the most specific destination', () => {
    renderAt('/products/pharmacy/sales');

    expect(sidebar().getByRole('link', { name: 'Record sale' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(sidebar().getByRole('link', { name: 'Products' })).not.toHaveAttribute('aria-current');
  });

  it('keeps a parent destination active on a nested route', () => {
    renderAt('/notifications/settings');

    expect(sidebar().getByRole('link', { name: 'Notifications' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('highlights the inventory landing page on its own route', () => {
    renderAt('/products/pharmacy');

    expect(sidebar().getByRole('link', { name: 'Products' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(sidebar().getByRole('link', { name: 'Record sale' })).not.toHaveAttribute('aria-current');
  });

  it('opens and closes the mobile drawer from the header', () => {
    renderAt('/dashboard');

    expect(document.getElementById('app-navigation-drawer')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(document.getElementById('app-navigation-drawer')).not.toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: 'Close navigation' })[0]);
    expect(document.getElementById('app-navigation-drawer')).toBeNull();
  });
});
