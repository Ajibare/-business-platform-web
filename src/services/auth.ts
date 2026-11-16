import { apiFetch } from './api';
import type {
  AcceptInvitationInput,
  AuthProfile,
  AuthResult,
  CreatedInvitation,
  InvitableRole,
  InvitationPreview,
  OnboardingOverview,
  PharmacyProfileInput,
  RegisterInput,
  RegistrationChallenge,
  ResendResult,
  SignInInput,
  StaffInvitation,
  StockSettingsInput,
  StockStartOption,
  VerifyRegistrationInput,
} from '@/types/auth';

/**
 * Authentication endpoints. Every function returns the unwrapped API `data`
 * payload; failures throw `ApiError` with the API error code intact.
 */
export const authApi = {
  register(input: RegisterInput): Promise<RegistrationChallenge> {
    return apiFetch<RegistrationChallenge>('/auth/register', {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify(input),
    });
  },

  verifyRegistration(input: VerifyRegistrationInput): Promise<AuthResult> {
    return apiFetch<AuthResult>('/auth/register/verify', {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify(input),
    });
  },

  resendVerification(email: string): Promise<ResendResult> {
    return apiFetch<ResendResult>('/auth/register/resend', {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify({ email }),
    });
  },

  signIn(input: SignInInput): Promise<AuthResult> {
    return apiFetch<AuthResult>('/auth/sign-in', {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify(input),
    });
  },

  signOut(): Promise<{ signedOut: true }> {
    return apiFetch<{ signedOut: true }>('/auth/sign-out', {
      method: 'POST',
      skipRefresh: true,
    });
  },

  /** Renews the access token from the HttpOnly refresh cookie. */
  refresh(): Promise<AuthResult> {
    return apiFetch<AuthResult>('/auth/refresh', {
      method: 'POST',
      anonymous: true,
      skipRefresh: true,
    });
  },

  me(): Promise<AuthProfile> {
    return apiFetch<AuthProfile>('/auth/me');
  },

  forgotPassword(identifier: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/password/forgot', {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify({ identifier }),
    });
  },

  resetPassword(input: {
    token: string;
    password: string;
    confirmPassword?: string;
  }): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/auth/password/reset', {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify(input),
    });
  },
};

export const invitationApi = {
  create(input: { email: string; phone?: string; role: InvitableRole }): Promise<CreatedInvitation> {
    return apiFetch<CreatedInvitation>('/invitations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  list(): Promise<StaffInvitation[]> {
    return apiFetch<StaffInvitation[]>('/invitations');
  },

  revoke(id: string): Promise<{ id: string; status: string }> {
    return apiFetch<{ id: string; status: string }>(`/invitations/${id}`, { method: 'DELETE' });
  },

  preview(token: string): Promise<InvitationPreview> {
    return apiFetch<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`, {
      anonymous: true,
    });
  },

  /** Used when the invitee does not have an account yet. */
  acceptNewAccount(token: string, input: AcceptInvitationInput): Promise<AuthResult> {
    return apiFetch<AuthResult>(`/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      anonymous: true,
      body: JSON.stringify(input),
    });
  },

  /** Used when the invitee is already signed in. */
  acceptExisting(token: string): Promise<AuthResult> {
    return apiFetch<AuthResult>(`/invitations/${encodeURIComponent(token)}/accept-existing`, {
      method: 'POST',
    });
  },
};

export const onboardingApi = {
  get(): Promise<OnboardingOverview> {
    return apiFetch<OnboardingOverview>('/onboarding');
  },

  savePharmacyProfile(input: PharmacyProfileInput): Promise<OnboardingOverview> {
    return apiFetch<OnboardingOverview>('/onboarding/steps/1', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  saveStockSettings(input: StockSettingsInput): Promise<OnboardingOverview> {
    return apiFetch<OnboardingOverview>('/onboarding/steps/2', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  saveStaffStep(): Promise<OnboardingOverview> {
    return apiFetch<OnboardingOverview>('/onboarding/steps/3', { method: 'PATCH' });
  },

  saveStockStep(choice: StockStartOption): Promise<OnboardingOverview> {
    return apiFetch<OnboardingOverview>('/onboarding/steps/4', {
      method: 'PATCH',
      body: JSON.stringify({ choice }),
    });
  },

  seedSampleData(): Promise<{ created: number; products: { id: string; name: string }[] }> {
    return apiFetch<{ created: number; products: { id: string; name: string }[] }>(
      '/onboarding/sample-data',
      { method: 'POST' },
    );
  },

  complete(): Promise<{ completed: true; nextPath: string }> {
    return apiFetch<{ completed: true; nextPath: string }>('/onboarding/complete', {
      method: 'POST',
    });
  },
};
