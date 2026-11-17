import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignUpFlow } from './sign-up-flow';
import { ApiError, NETWORK_ERROR_MESSAGE } from '@/services/api';
import { authApi } from '@/services/auth';
import type { RegistrationChallenge } from '@/types/auth';

const replace = jest.fn();
const applySession = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ signIn: applySession }),
}));

jest.mock('@/services/auth', () => ({
  authApi: {
    register: jest.fn(),
    verifyRegistration: jest.fn(),
    resendVerification: jest.fn(),
  },
}));

const registerMock = authApi.register as jest.Mock;

const PASSWORD = 'Harbour-Lantern-47';

const challenge: RegistrationChallenge = {
  email: 'ad**@pharmacy.ng',
  phone: null,
  verificationRequired: true,
  expiresInMinutes: 15,
  resendAvailableInSeconds: 60,
  remainingResends: 6,
};

function fillForm() {
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Ada Obi' } });
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'ada@pharmacy.ng' },
  });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: PASSWORD } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: PASSWORD } });
  fireEvent.click(screen.getByLabelText(/I agree to the Terms of Service/));
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('SignUpFlow', () => {
  beforeEach(() => {
    replace.mockClear();
    applySession.mockClear();
    registerMock.mockReset();
  });

  it('creates the pending registration and moves to the code step', async () => {
    registerMock.mockResolvedValue(challenge);

    render(<SignUpFlow />);
    fillForm();
    submit();

    await waitFor(() =>
      expect(registerMock).toHaveBeenCalledWith({
        name: 'Ada Obi',
        email: 'ada@pharmacy.ng',
        phone: undefined,
        password: PASSWORD,
        confirmPassword: PASSWORD,
        termsAccepted: true,
      }),
    );
    expect(await screen.findByText('Check your email')).toBeTruthy();
    expect(screen.getByText('ad**@pharmacy.ng')).toBeTruthy();
  });

  it('shows the development code when the API is not sending email', async () => {
    registerMock.mockResolvedValue({ ...challenge, devCode: '963013' });

    render(<SignUpFlow />);
    fillForm();
    submit();

    expect(await screen.findByText('Local development only')).toBeTruthy();
    expect(screen.getByText('963013')).toBeTruthy();
  });

  it('hides the development notice when the API sends real email', async () => {
    registerMock.mockResolvedValue(challenge);

    render(<SignUpFlow />);
    fillForm();
    submit();

    expect(await screen.findByText('Check your email')).toBeTruthy();
    expect(screen.queryByText('Local development only')).toBeNull();
  });

  it('puts a duplicate email next to the email input', async () => {
    registerMock.mockRejectedValue(
      new ApiError('An account already exists for this email address. Try signing in instead.', {
        statusCode: 409,
        code: 'EMAIL_IN_USE',
        field: 'email',
      }),
    );

    render(<SignUpFlow />);
    fillForm();
    submit();

    expect(
      await screen.findByText(
        'An account already exists for this email address. Try signing in instead.',
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Check your email')).toBeNull();
  });

  it('marks every field the API rejected', async () => {
    registerMock.mockRejectedValue(
      new ApiError('Enter an email address with at most 254 characters.', {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        field: 'email',
        details: [
          { field: 'email', message: 'Enter an email address with at most 254 characters.' },
          { field: 'name', message: 'Enter your full name (at least 2 characters).' },
        ],
      }),
    );

    render(<SignUpFlow />);
    fillForm();
    submit();

    expect(
      await screen.findByText('Enter an email address with at most 254 characters.'),
    ).toBeTruthy();
    expect(screen.getByText('Enter your full name (at least 2 characters).')).toBeTruthy();
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows every unmet password rule the API reported', async () => {
    registerMock.mockRejectedValue(
      new ApiError('Use at least 10 characters.', {
        statusCode: 400,
        code: 'WEAK_PASSWORD',
        field: 'password',
        details: {
          issues: ['Use at least 10 characters.', 'Do not use your name or email address in the password.'],
        },
      }),
    );

    render(<SignUpFlow />);
    fillForm();
    submit();

    expect(
      await screen.findByText(
        'Use at least 10 characters. Do not use your name or email address in the password.',
      ),
    ).toBeTruthy();
  });

  it('explains a network failure instead of showing request internals', async () => {
    registerMock.mockRejectedValue(new ApiError(NETWORK_ERROR_MESSAGE, { code: 'NETWORK_ERROR' }));

    render(<SignUpFlow />);
    fillForm();
    submit();

    expect(await screen.findByText(NETWORK_ERROR_MESSAGE)).toBeTruthy();
  });

  it('uses account wording for an unexpected server error', async () => {
    registerMock.mockRejectedValue(
      new ApiError('We could not complete your request. Please try again later.', {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
      }),
    );

    render(<SignUpFlow />);
    fillForm();
    submit();

    expect(
      await screen.findByText("We couldn't create your account right now. Please try again later."),
    ).toBeTruthy();
    expect(screen.queryByText('We could not complete your request. Please try again later.')).toBeNull();
  });

  it('disables the submit button while the request is in flight', async () => {
    let resolve!: (value: RegistrationChallenge) => void;
    registerMock.mockReturnValue(new Promise<RegistrationChallenge>((done) => (resolve = done)));

    render(<SignUpFlow />);
    fillForm();
    submit();

    const button = screen.getByRole('button', { name: /Creating account/ });
    await waitFor(() => expect(button).toBeDisabled());

    fireEvent.click(button);
    expect(registerMock).toHaveBeenCalledTimes(1);

    resolve(challenge);
    expect(await screen.findByText('Check your email')).toBeTruthy();
  });

  it('blocks submission on client-side validation before calling the API', async () => {
    render(<SignUpFlow />);
    submit();

    expect(await screen.findByText('Enter your full name.')).toBeTruthy();
    expect(registerMock).not.toHaveBeenCalled();
  });
});
