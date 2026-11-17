'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SectionLoader } from '@/components/ui/loading';
import { useBranch } from '@/hooks/use-branch';
import { usePermissions } from '@/hooks/use-permissions';
import { staffApi } from '@/services/platform';
import { ROLE_LABELS, type MembershipStatus, type Role } from '@/types/auth';
import type { StaffRecord } from '@/types/platform';
import { MEMBER_STATUS_LABELS, MEMBER_STATUS_TONES } from './labels';

export function StaffList() {
  const { can } = usePermissions();
  const { branches } = useBranch();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');

  const query = useQuery<StaffRecord[]>({
    queryKey: ['staff', 'list', { search, role, branchId, status }],
    meta: { silent: true },
    queryFn: () =>
      staffApi.list({
        search: search.trim() || undefined,
        role: (role || undefined) as Role | undefined,
        branchId: branchId || undefined,
        status: (status || undefined) as MembershipStatus | undefined,
        limit: 200,
      }),
  });

  const rows = query.data ?? [];
  const active = rows.filter((member) => member.status === 'ACTIVE').length;
  const suspended = rows.filter((member) => member.status === 'SUSPENDED').length;
  const invite = can('staff:manage');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Everyone with access to this organisation, the role they hold and the branches they work in."
        actions={
          invite ? (
            <Link
              href="/staff/invite"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Invite staff
            </Link>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm font-medium text-slate">Shown</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-slate">Active</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-slate">Suspended</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{suspended}</p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Users className="h-5 w-5 text-info" aria-hidden="true" />
            Team
          </h2>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or phone"
                aria-label="Search staff"
                className="pl-9"
              />
            </div>
            <SearchableSelect
              options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              value={role}
              onChange={setRole}
              placeholder="All roles"
              searchPlaceholder="Search roles…"
              ariaLabel="Filter by role"
              clearable
              size="md"
            />
            <SearchableSelect
              options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
              value={branchId}
              onChange={setBranchId}
              placeholder="All branches"
              searchPlaceholder="Search branches…"
              ariaLabel="Filter by branch"
              clearable
              size="md"
            />
            <SearchableSelect
              options={(Object.keys(MEMBER_STATUS_LABELS) as MembershipStatus[]).map((value) => ({
                value,
                label: MEMBER_STATUS_LABELS[value],
              }))}
              value={status}
              onChange={setStatus}
              placeholder="Any status"
              searchPlaceholder="Search statuses…"
              ariaLabel="Filter by status"
              clearable
              size="md"
            />
          </div>
        </div>

        {query.isLoading ? <SectionLoader label="Loading staff…" /> : null}

        {query.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {query.error instanceof Error ? query.error.message : 'Unable to load staff.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {query.data && rows.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={UserPlus}
            title="No staff match this view"
            description={
              search || role || branchId || status
                ? 'Clear a filter to see more people.'
                : 'Invite your team so more than one person can run the pharmacy.'
            }
            action={
              invite && !search && !role && !branchId && !status ? (
                <Link
                  href="/staff/invite"
                  className="inline-flex h-9 items-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Invite staff
                </Link>
              ) : undefined
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate">
                <tr>
                  <th className="py-2">Member</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Branches</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Last sign-in</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((member) => (
                  <tr key={member.userId}>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/staff/${member.userId}`}
                        className="font-medium text-ink hover:text-primary-700"
                      >
                        {member.name ?? member.email ?? 'Unnamed member'}
                      </Link>
                      <p className="text-xs text-slate">{member.email ?? member.phone ?? '—'}</p>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge status="neutral">{ROLE_LABELS[member.role]}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-slate">
                      {member.branches.length === 0
                        ? member.role === 'OWNER' || member.role === 'ADMIN'
                          ? 'All branches'
                          : 'None assigned'
                        : member.branches.map((branch) => branch.code).join(', ')}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge status={MEMBER_STATUS_TONES[member.status]}>
                        {MEMBER_STATUS_LABELS[member.status]}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-slate">
                      {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/staff/${member.userId}`}
                        className="text-xs font-medium text-primary-700 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
