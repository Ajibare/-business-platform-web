import type { MembershipStatus } from '@/types/auth';

export const MEMBER_STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
};

export type BadgeTone = 'success' | 'warning' | 'neutral' | 'danger' | 'info';

export const MEMBER_STATUS_TONES: Record<MembershipStatus, BadgeTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  DEACTIVATED: 'neutral',
};
