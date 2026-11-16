/**
 * Types for the authentication, invitation and onboarding contracts documented
 * in `business-platform-api/docs/AUTH_API_CONTRACTS.md`. They mirror the API
 * response bodies exactly so a change on one side is a compile error on the
 * other.
 */

export type Role = 'OWNER' | 'MANAGER' | 'INVENTORY_STAFF' | 'READ_ONLY';
export type InvitableRole = Exclude<Role, 'OWNER'>;
export type UserStatus = 'ACTIVE' | 'DEACTIVATED';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
export type StockStartOption = 'IMPORT' | 'MANUAL' | 'SAMPLE' | 'EMPTY';
export type OnboardingStatus = 'IN_PROGRESS' | 'COMPLETED';

export const OUTLET_PROFILES = [
  'Community pharmacy',
  'Hospital pharmacy',
  'Chain outlet',
  'Wholesale distributor',
  'Other',
] as const;

export type OutletProfile = (typeof OUTLET_PROFILES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  INVENTORY_STAFF: 'Inventory staff',
  READ_ONLY: 'Read-only',
};

export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface AuthOrganisation {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  phone: string | null;
  address: string | null;
  outletProfile: string | null;
  nearExpiryWarningDays: number;
  defaultUnit: string | null;
  /** `null` means "not configured"; it is not the same as a minimum of zero. */
  defaultMinStockLevel: number | null;
  onboardingCompletedAt: string | null;
}

export interface OnboardingStepState {
  step: number;
  key: string;
  title: string;
  description: string;
  optional: boolean;
  completed: boolean;
}

export interface OnboardingChecklistItem {
  key: string;
  label: string;
  done: boolean;
  optional: boolean;
}

export interface OnboardingSummary {
  status: OnboardingStatus;
  currentStep: number;
  completedSteps: number[];
  firstIncompleteStep: number | null;
  steps: OnboardingStepState[];
  checklist: OnboardingChecklistItem[];
  requiresSetup: boolean;
  allTasksDone: boolean;
  completedAt: string | null;
}

export interface AuthProfile {
  user: AuthUser;
  organisation: AuthOrganisation;
  membership: { role: Role; active: boolean };
  onboarding: OnboardingSummary;
  /** Where the client should land after sign-in. */
  nextPath: string;
}

export interface AuthResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
  profile: AuthProfile;
}

export interface RegistrationChallenge {
  /** Masked for display, for example `ow****@example.com`. */
  email: string;
  phone: string | null;
  verificationRequired: true;
  expiresInMinutes: number;
  resendAvailableInSeconds: number;
  remainingResends: number;
  /** Only returned by a non-production API that logs email instead of sending it. */
  devCode?: string;
}

export interface ResendResult {
  sent: true;
  resendAvailableInSeconds: number;
  remainingResends: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword?: string;
  termsAccepted: boolean;
}

export interface VerifyRegistrationInput {
  email: string;
  code: string;
}

export interface SignInInput {
  identifier: string;
  password: string;
}

export interface InvitationPreview {
  organizationName: string;
  role: Role;
  email: string | null;
  phone: string | null;
  hasAccount: boolean;
  expiresAt: string;
}

export interface StaffInvitation {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CreatedInvitation {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
  delivered: boolean;
  /** Non-production only: lets the invite flow be tested without a mailbox. */
  devInviteUrl?: string;
}

export interface OnboardingOverview {
  organization: Omit<AuthOrganisation, 'onboardingCompletedAt'>;
  progress: OnboardingSummary;
  counts: { members: number; products: number; pendingInvitations: number };
  inventoryNotice: string;
}

export interface PharmacyProfileInput {
  name: string;
  outletProfile: string;
  address?: string;
  timezone?: string;
}

export interface StockSettingsInput {
  nearExpiryWarningDays: number;
  defaultUnit?: string;
  defaultMinStockLevel?: number | null;
}

export interface AcceptInvitationInput {
  name: string;
  password: string;
  confirmPassword?: string;
}
