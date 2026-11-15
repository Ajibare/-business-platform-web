import { render, screen } from '@testing-library/react';
import { AuthGuard } from './auth-guard';
import { useAuth } from '@/hooks/use-auth';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = useAuth as jest.Mock;

describe('AuthGuard', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('redirects to the login page when there is no access token', () => {
    useAuthMock.mockReturnValue({ accessToken: null, isLoading: false });

    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>,
    );

    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('renders children when authenticated', () => {
    useAuthMock.mockReturnValue({ accessToken: 'token', isLoading: false });

    render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>,
    );

    expect(screen.getByText('secret')).toBeTruthy();
  });

  it('renders a loading state while auth is resolving', () => {
    useAuthMock.mockReturnValue({ accessToken: null, isLoading: true });

    const { container } = render(
      <AuthGuard>
        <div>secret</div>
      </AuthGuard>,
    );

    expect(container.textContent).not.toContain('secret');
  });
});
