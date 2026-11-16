import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignInForm } from './sign-in-form';
import { ApiError } from '@/services/api';
import { authApi } from '@/services/auth';
import type { AuthProfile, AuthResult } from '@/types/auth';

const replace = jest.fn();
const applySession = jest.fn();
let nextParam: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'next' ? nextParam : null),
  }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ signIn: applySession }),
}));

jest.mock('@/services/auth', () => ({
  authApi: { signIn: jest.fn() },
}));

const signInMock = authApi.signIn as jest.Mock;

const profile = {
  user: { id: 'u1', name: 'Ada Obi', email: 'ada@pharmacy.com', phone: null },
  organisation: { id: 'o1', name: 'Ada Pharmacy', role: 'OWNER' },
  membership: { role: 'OWNER', active: true },
  onboarding: { requiresSetup: false, allTasksDone: true, checklist: [] },
  nextPath: '/dashboard',
} as unknown as AuthProfile;

const result: AuthResult = {
  accessToken: 'access-token',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  profile,
};

function fillAndSubmit(identifier = 'ada@pharmacy.com', password = 'CorrectHorse9') {
  fireEvent.change(screen.getByLabelText('Email or phone'), { target: { value: identifier } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignInForm', () => {
  beforeEach(() => {
    replace.mockClear();
    applySession.mockClear();
    signInMock.mockReset();
    nextParam = null;
  });

  it('sends the credentials, stores the session and follows the profile destination', async () => {
    signInMock.mockResolvedValue(result);

    render(<SignInForm />);
    fillAndSubmit();

    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith({
        identifier: 'ada@pharmacy.com',
        password: 'CorrectHorse9',
      }),
    );
    expect(applySession).toHaveBeenCalledWith(result);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('honours a same-origin ?next= destination', async () => {
    nextParam = '/products/pharmacy/receipts';
    signInMock.mockResolvedValue(result);

    render(<SignInForm />);
    fillAndSubmit();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/products/pharmacy/receipts'));
  });

  it.each(['//evil.example.com', 'https://evil.example.com'])(
    'ignores the open-redirect attempt %s',
    async (candidate) => {
      nextParam = candidate;
      signInMock.mockResolvedValue(result);

      render(<SignInForm />);
      fillAndSubmit();

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
    },
  );

  it('shows the API wording for a locked account', async () => {
    signInMock.mockRejectedValue(
      new ApiError('Too many attempts. Try again in 15 minutes.', {
        statusCode: 423,
        code: 'ACCOUNT_LOCKED',
      }),
    );

    render(<SignInForm />);
    fillAndSubmit();

    expect(
      await screen.findByText('Too many attempts. Try again in 15 minutes.'),
    ).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('places a field error next to the field it belongs to', async () => {
    const message = 'Enter a valid email address or Nigerian mobile number.';
    signInMock.mockRejectedValue(new ApiError(message, { statusCode: 400, field: 'identifier' }));

    render(<SignInForm />);
    fillAndSubmit();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByLabelText('Email or phone')).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains a network failure instead of blaming the credentials', async () => {
    signInMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<SignInForm />);
    fillAndSubmit();

    expect(
      await screen.findByText('We could not reach the server. Check your connection and try again.'),
    ).toBeTruthy();
  });

  it('blocks submission and shows a field message for an invalid identifier', async () => {
    render(<SignInForm />);
    fillAndSubmit('0123456789');

    expect(
      await screen.findByText(
        'Enter a valid email address or Nigerian mobile number, for example 0803 123 4567.',
      ),
    ).toBeTruthy();
    expect(signInMock).not.toHaveBeenCalled();
  });
});
