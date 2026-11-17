import { apiFetch } from './api';
import type { Role, StaffInvitation } from '@/types/auth';
import type { Batch, LowStockItem, Sale } from '@/types/api';
import type {
  BranchComparison,
  BranchDetail,
  BranchRecord,
  CreateBranchInput,
  CreateTransferInput,
  MemberOverride,
  OrganisationSettings,
  PermissionCatalogue,
  PerformanceTrend,
  ReceivedLineInput,
  RolePermissions,
  StaffActivityEntry,
  StaffDetail,
  StaffListQuery,
  StaffRecord,
  TransferRecord,
  TransferStatus,
  TrendGranularity,
  UpdateBranchInput,
  UpdateStaffInput,
} from '@/types/platform';

/** Runs one request against a named branch instead of the chosen one. */
function branchScoped(branchId: string): RequestInit {
  return { headers: { 'X-Branch-Id': branchId } };
}

export const branchApi = {
  list(): Promise<BranchRecord[]> {
    return apiFetch<BranchRecord[]>('/branches');
  },

  get(branchId: string): Promise<BranchDetail> {
    return apiFetch<BranchDetail>(`/branches/${branchId}`);
  },

  create(input: CreateBranchInput): Promise<BranchRecord> {
    return apiFetch<BranchRecord>('/branches', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  update(branchId: string, input: UpdateBranchInput): Promise<BranchRecord> {
    return apiFetch<BranchRecord>(`/branches/${branchId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  activate(branchId: string): Promise<BranchRecord> {
    return apiFetch<BranchRecord>(`/branches/${branchId}/activate`, { method: 'POST' });
  },

  deactivate(branchId: string): Promise<BranchRecord> {
    return apiFetch<BranchRecord>(`/branches/${branchId}/deactivate`, { method: 'POST' });
  },

  assignManager(branchId: string, managerUserId: string | null): Promise<BranchRecord> {
    return apiFetch<BranchRecord>(`/branches/${branchId}/manager`, {
      method: 'PUT',
      body: JSON.stringify({ managerUserId }),
    });
  },

  /** Replaces the branch's staff list with the given members. */
  assignStaff(branchId: string, userIds: string[]): Promise<{ branchId: string; userIds: string[] }> {
    return apiFetch<{ branchId: string; userIds: string[] }>(`/branches/${branchId}/staff`, {
      method: 'PUT',
      body: JSON.stringify({ userIds }),
    });
  },

  removeStaff(
    branchId: string,
    userId: string,
  ): Promise<{ branchId: string; userId: string }> {
    return apiFetch<{ branchId: string; userId: string }>(`/branches/${branchId}/staff/${userId}`, {
      method: 'DELETE',
    });
  },
};

export const staffApi = {
  list(query: StaffListQuery = {}): Promise<StaffRecord[]> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.role) params.set('role', query.role);
    if (query.branchId) params.set('branchId', query.branchId);
    if (query.status) params.set('status', query.status);
    if (query.limit) params.set('limit', String(query.limit));
    const suffix = params.toString();
    return apiFetch<StaffRecord[]>(`/staff${suffix ? `?${suffix}` : ''}`);
  },

  get(userId: string): Promise<StaffDetail> {
    return apiFetch<StaffDetail>(`/staff/${userId}`);
  },

  update(userId: string, input: UpdateStaffInput): Promise<StaffDetail> {
    return apiFetch<StaffDetail>(`/staff/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  suspend(userId: string, reason?: string): Promise<StaffDetail> {
    return apiFetch<StaffDetail>(`/staff/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  deactivate(userId: string, reason?: string): Promise<StaffDetail> {
    return apiFetch<StaffDetail>(`/staff/${userId}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  activate(userId: string): Promise<StaffDetail> {
    return apiFetch<StaffDetail>(`/staff/${userId}/activate`, { method: 'POST' });
  },

  activity(userId: string, limit = 50): Promise<StaffActivityEntry[]> {
    return apiFetch<StaffActivityEntry[]>(`/staff/${userId}/activity?limit=${limit}`);
  },

  /** Ends the membership; the history the member created is kept. */
  remove(userId: string, reason?: string): Promise<{ userId: string; status: string }> {
    return apiFetch<{ userId: string; status: string }>(`/staff/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  },
};

export const permissionApi = {
  catalogue(): Promise<PermissionCatalogue> {
    return apiFetch<PermissionCatalogue>('/permissions/catalogue');
  },

  roles(): Promise<RolePermissions[]> {
    return apiFetch<RolePermissions[]>('/permissions/roles');
  },

  setRole(role: Role, permissions: string[]): Promise<{ role: Role; permissions: string[] }> {
    return apiFetch<{ role: Role; permissions: string[] }>(`/permissions/roles/${role}`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  },

  memberOverrides(userId: string): Promise<MemberOverride[]> {
    return apiFetch<MemberOverride[]>(`/permissions/members/${userId}`);
  },

  setMemberOverrides(
    userId: string,
    input: { grants: string[]; denies: string[] },
  ): Promise<MemberOverride[]> {
    return apiFetch<MemberOverride[]>(`/permissions/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },
};

export const transferApi = {
  list(params: {
    status?: TransferStatus;
    direction?: 'in' | 'out' | 'all';
    limit?: number;
  } = {}): Promise<TransferRecord[]> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.direction) query.set('direction', params.direction);
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString();
    return apiFetch<TransferRecord[]>(`/pharmacy/transfers${suffix ? `?${suffix}` : ''}`);
  },

  get(id: string): Promise<TransferRecord> {
    return apiFetch<TransferRecord>(`/pharmacy/transfers/${id}`);
  },

  create(input: CreateTransferInput): Promise<TransferRecord> {
    return apiFetch<TransferRecord>('/pharmacy/transfers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  submit(id: string): Promise<TransferRecord> {
    return apiFetch<TransferRecord>(`/pharmacy/transfers/${id}/submit`, { method: 'POST' });
  },

  approve(id: string): Promise<TransferRecord> {
    return apiFetch<TransferRecord>(`/pharmacy/transfers/${id}/approve`, { method: 'POST' });
  },

  reject(id: string, reason: string): Promise<TransferRecord> {
    return apiFetch<TransferRecord>(`/pharmacy/transfers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  cancel(id: string): Promise<TransferRecord> {
    return apiFetch<TransferRecord>(`/pharmacy/transfers/${id}/cancel`, { method: 'POST' });
  },

  dispatch(id: string): Promise<TransferRecord> {
    return apiFetch<TransferRecord>(`/pharmacy/transfers/${id}/dispatch`, { method: 'POST' });
  },

  receive(id: string, input: { lines?: ReceivedLineInput[]; note?: string } = {}): Promise<TransferRecord> {
    return apiFetch<TransferRecord>(`/pharmacy/transfers/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};

export const organisationApi = {
  settings(): Promise<OrganisationSettings> {
    return apiFetch<OrganisationSettings>('/organisations/settings');
  },

  updateSettings(input: Partial<Omit<OrganisationSettings, 'id'>>): Promise<OrganisationSettings> {
    return apiFetch<OrganisationSettings>('/organisations/settings', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};

export const branchReportApi = {
  /** One row per branch; pass `all` to compare every branch in reach. */
  comparison(params: { from?: string; to?: string; branchId?: string } = {}): Promise<BranchComparison> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const suffix = query.toString();
    return apiFetch<BranchComparison>(
      `/pharmacy/reports/branches${suffix ? `?${suffix}` : ''}`,
      params.branchId ? branchScoped(params.branchId) : undefined,
    );
  },

  trend(params: {
    granularity?: TrendGranularity;
    points?: number;
    branchId?: string;
  } = {}): Promise<PerformanceTrend> {
    const query = new URLSearchParams();
    if (params.granularity) query.set('granularity', params.granularity);
    if (params.points) query.set('points', String(params.points));
    const suffix = query.toString();
    return apiFetch<PerformanceTrend>(
      `/pharmacy/reports/trend${suffix ? `?${suffix}` : ''}`,
      params.branchId ? branchScoped(params.branchId) : undefined,
    );
  },
};

/** The branch's own stock, read without changing the chosen branch. */
export const branchInventoryApi = {
  batches(branchId: string, limit = 200): Promise<Batch[]> {
    return apiFetch<Batch[]>(`/pharmacy/batches?limit=${limit}`, branchScoped(branchId));
  },

  sales(branchId: string, limit = 20): Promise<Sale[]> {
    return apiFetch<Sale[]>(`/pharmacy/sales?limit=${limit}`, branchScoped(branchId));
  },

  lowStock(branchId: string): Promise<LowStockItem[]> {
    return apiFetch<LowStockItem[]>('/pharmacy/reports/low-stock', branchScoped(branchId));
  },
};

/** Re-exported so pages can type an invitation without two imports. */
export type { StaffInvitation };
