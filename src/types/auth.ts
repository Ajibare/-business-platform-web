/**
 * Types for the authentication, invitation and onboarding contracts documented
 * in `business-platform-api/docs/AUTH_API_CONTRACTS.md`. They mirror the API
 * response bodies exactly so a change on one side is a compile error on the
 * other.
 */

export type Role =
  | 'OWNER'
  | 'ADMIN'
  | 'BRANCH_MANAGER'
  | 'PHARMACIST'
  | 'INVENTORY_OFFICER'
  | 'CASHIER'
  | 'MANAGER'
  | 'INVENTORY_STAFF'
  | 'READ_ONLY';
export type InvitableRole = Exclude<Role, 'OWNER'>;
export type UserStatus = 'ACTIVE' | 'DEACTIVATED' | 'SUSPENDED';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
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
  ADMIN: 'Admin',
  BRANCH_MANAGER: 'Branch manager',
  PHARMACIST: 'Pharmacist',
  INVENTORY_OFFICER: 'Inventory officer',
  CASHIER: 'Cashier',
  MANAGER: 'Manager (legacy)',
  INVENTORY_STAFF: 'Inventory staff (legacy)',
  READ_ONLY: 'Read-only',
};

/** The roles offered when inviting or editing staff, in display order. */
export const STAFF_ROLES: Role[] = [
  'ADMIN',
  'BRANCH_MANAGER',
  'PHARMACIST',
  'INVENTORY_OFFICER',
  'CASHIER',
  'MANAGER',
  'INVENTORY_STAFF',
  'READ_ONLY',
];

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

export interface AuthBranch {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

export interface AuthProfile {
  user: AuthUser;
  organisation: AuthOrganisation;
  membership: { role: Role; active: boolean; status: MembershipStatus };
  /** Permission keys the member holds; the interface is built from these. */
  permissions: string[];
  /** Branches the member may work in. */
  branches: AuthBranch[];
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
  branchNames: string[];
}

export interface StaffInvitation {
  id: string;
  email: string | null;
  phone: string | null;
  role: Role;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  branchIds: string[];
  branchNames: string[];
  resendCount: number;
  lastSentAt: string | null;
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
  branchIds: string[];
  /** Non-production only: lets the invite flow be tested without a mailbox. */
  devInviteUrl?: string;
}

export interface ResentInvitation {
  id: string;
  email: string | null;
  expiresAt: string;
  delivered: boolean;
  /** Non-production only: the fresh link, when the API logs email instead. */
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
