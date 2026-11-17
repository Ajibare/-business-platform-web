import type { MembershipStatus, Role } from './auth';

/**
 * Contracts for the staff, branch, permission and transfer endpoints.
 *
 * They mirror the API response bodies so a change on one side is a compile
 * error on the other.
 */

export type BranchStatus = 'ACTIVE' | 'INACTIVE';

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: BranchStatus;
  isDefault: boolean;
  managerUserId: string | null;
  managerName: string | null;
  staffCount: number;
  batchCount: number;
  stockUnits: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchStaffRecord {
  userId: string;
  name: string | null;
  email: string | null;
  role: Role;
  memberStatus: MembershipStatus;
  isManager: boolean;
  assignedAt: string;
}

export interface BranchDetail extends BranchRecord {
  staff: BranchStaffRecord[];
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  managerUserId?: string;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface StaffBranchSummary {
  id: string;
  name: string;
  code: string;
}

export interface StaffRecord {
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  status: MembershipStatus;
  statusReason: string | null;
  active: boolean;
  lastLoginAt: string | null;
  branches: StaffBranchSummary[];
  joinedAt: string;
  updatedAt: string;
}

export interface StaffDetail extends StaffRecord {
  /** The permission keys the member effectively holds. */
  permissions: string[];
  permissionOverrides: { permission: string; effect: PermissionEffect }[];
  managedBranchIds: string[];
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  role?: Role;
  branchIds?: string[];
}

export interface StaffActivityEntry {
  id: string;
  branchId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface StaffListQuery {
  search?: string;
  role?: Role;
  branchId?: string;
  status?: MembershipStatus;
  limit?: number;
}

export type PermissionEffect = 'GRANT' | 'DENY';

export interface MemberOverride {
  permission: string;
  effect: PermissionEffect;
}

export interface PermissionDefinition {
  key: string;
  group: string;
  label: string;
  description: string;
}

export interface PermissionRoleDefinition {
  role: Role;
  label: string;
  editable: boolean;
  defaults: string[];
}

export interface PermissionCatalogue {
  permissions: PermissionDefinition[];
  roles: PermissionRoleDefinition[];
}

export interface RolePermissions {
  role: Role;
  label: string;
  /** The owner role always holds everything and cannot be edited. */
  editable: boolean;
  permissions: string[];
}

export type TransferStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface TransferLine {
  id: string;
  productId: string;
  productName: string;
  sourceBatchId: string;
  destinationBatchId: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  unit: string;
  quantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
}

export interface TransferRecord {
  id: string;
  reference: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  status: TransferStatus;
  note: string | null;
  requestedById: string | null;
  approvedById: string | null;
  dispatchedById: string | null;
  receivedById: string | null;
  rejectedById: string | null;
  rejectedReason: string | null;
  approvedAt: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: TransferLine[];
}

export interface CreateTransferInput {
  fromBranchId?: string;
  toBranchId: string;
  note?: string;
  submit?: boolean;
  lines: { sourceBatchId: string; quantity: number }[];
}

export interface ReceivedLineInput {
  lineId: string;
  receivedQuantity: number;
  damagedQuantity?: number;
}

export interface BranchSalesTotals {
  transactions: number;
  units: number;
  revenue: number;
  grossProfit: number | null;
  refunds: number;
  netSales: number;
}

export interface BranchComparisonRow {
  branchId: string;
  name: string;
  code: string;
  status: string;
  sales: BranchSalesTotals;
  stock: {
    quantity: number;
    value: number | null;
    lowStock: number;
    outOfStock: number;
  };
  movements: {
    issued: number;
    received: number;
    transferredIn: number;
    transferredOut: number;
    adjustments: number;
  };
  expiry: {
    expiredBatches: number;
    nearExpiryBatches: number;
    expiredQuantity: number;
    nearExpiryQuantity: number;
    valueAtRisk: number | null;
  };
}

export interface BranchComparison {
  from: string;
  to: string;
  timeZone: string;
  currency: string;
  consolidated: boolean;
  branches: BranchComparisonRow[];
  totals: Omit<BranchComparisonRow, 'branchId' | 'name' | 'code' | 'status'>;
}

export type TrendGranularity = 'day' | 'week' | 'month';

export interface TrendPoint {
  period: string;
  label: string;
  sales: { transactions: number; revenue: number; units: number };
  movements: { issued: number; received: number };
  byBranch: Record<string, { transactions: number; revenue: number; units: number }>;
}

export interface PerformanceTrend {
  granularity: TrendGranularity;
  timeZone: string;
  currency: string;
  from: string;
  to: string;
  points: TrendPoint[];
  branches: StaffBranchSummary[];
}

export interface OrganisationSettings {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  nearExpiryWarningDays: number;
  requireTransferApproval: boolean;
}
