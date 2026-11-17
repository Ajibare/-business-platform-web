'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Pencil, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SectionLoader } from '@/components/ui/loading';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/services/api';
import { branchApi, staffApi } from '@/services/platform';
import { ROLE_LABELS } from '@/types/auth';
import type { BranchDetail as BranchDetailRecord, BranchRecord, StaffRecord } from '@/types/platform';
import { BranchForm } from './branch-form';
import { BranchOperations } from './branch-operations';

export function BranchDetail({ branchId }: { branchId: string }) {
  const { can } = usePermissions();
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const detail = useQuery<BranchDetailRecord>({
    queryKey: ['branch', branchId],
    meta: { silent: true },
    queryFn: () => branchApi.get(branchId),
  });

  const directory = useQuery<StaffRecord[]>({
    queryKey: ['staff', 'directory'],
    meta: { silent: true },
    enabled: can('staff:read'),
    queryFn: () => staffApi.list({ limit: 200 }),
  });

  const branch = detail.data;
  const manage = can('branch:manage');

  const refresh = async (options: { profile?: boolean } = {}) => {
    await queryClient.invalidateQueries({ queryKey: ['branch', branchId] });
    await queryClient.invalidateQueries({ queryKey: ['branches'] });
    if (options.profile) await refreshProfile();
  };

  const toggleStatus = async () => {
    if (!branch) return;
    setBusy('status');
    try {
      const updated =
        branch.status === 'ACTIVE'
          ? await branchApi.deactivate(branch.id)
          : await branchApi.activate(branch.id);
      toast.success(updated.status === 'ACTIVE' ? 'Branch activated.' : 'Branch deactivated.');
      await refresh({ profile: true });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'We could not update this branch.');
    } finally {
      setBusy(null);
    }
  };

  const saveManager = async (managerUserId: string | null) => {
    if (!branch) return;
    setBusy('manager');
    try {
      await branchApi.assignManager(branch.id, managerUserId);
      toast.success(managerUserId ? 'Branch manager assigned.' : 'Branch manager cleared.');
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'We could not assign that manager.');
    } finally {
      setBusy(null);
    }
  };

  const saveStaff = async () => {
    if (!branch || selected === null) return;
    setBusy('staff');
    try {
      await branchApi.assignStaff(branch.id, selected);
      toast.success('Branch staff updated.');
      setSelected(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'We could not update branch staff.');
    } finally {
      setBusy(null);
    }
  };

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Branch" description="Loading branch details…" />
        <Card className="p-6">
          <SectionLoader label="Loading branch…" className="py-8" />
        </Card>
      </div>
    );
  }

  if (detail.error || !branch) {
    return (
      <div className="space-y-6">
        <PageHeader title="Branch" />
        <Card className="p-6">
          <EmptyState
            icon={Building2}
            title="This branch is not available"
            description={
              detail.error instanceof Error
                ? detail.error.message
                : 'The branch may have been removed, or you may not have access to it.'
            }
            action={
              <Link
                href="/branches"
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-background"
              >
                Back to branches
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const assigned = selected ?? branch.staff.map((member) => member.userId);
  const managerOptions = (directory.data ?? [])
    .filter((member) => member.status === 'ACTIVE')
    .map((member) => ({
      value: member.userId,
      label: member.name ?? member.email ?? 'Unnamed member',
      description: `${ROLE_LABELS[member.role]}${member.email ? ` · ${member.email}` : ''}`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={branch.name}
        description={branch.address ?? 'No address recorded for this branch.'}
        actions={
          <>
            <Link
              href="/branches"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All branches
            </Link>
            {manage ? (
              <>
                <Button variant="outline" size="md" onClick={() => setEditing((open) => !open)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  {editing ? 'Close editor' : 'Edit branch'}
                </Button>
                <Button
                  variant={branch.status === 'ACTIVE' ? 'outline' : 'primary'}
                  size="md"
                  disabled={busy === 'status'}
                  onClick={() => void toggleStatus()}
                >
                  {busy === 'status'
                    ? 'Saving…'
                    : branch.status === 'ACTIVE'
                      ? 'Deactivate'
                      : 'Activate'}
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge status="neutral">{branch.code}</Badge>
        {branch.isDefault ? <Badge status="info">Default branch</Badge> : null}
        <Badge status={branch.status === 'ACTIVE' ? 'success' : 'warning'}>
          {branch.status === 'ACTIVE' ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Contact</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Phone</dt>
              <dd className="text-ink">{branch.phone ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Email</dt>
              <dd className="break-all text-right text-ink">{branch.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Created</dt>
              <dd className="text-ink">{new Date(branch.createdAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Updated</dt>
              <dd className="text-ink">{new Date(branch.updatedAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Stock at this branch</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Units on hand</dt>
              <dd className="text-ink">{new Intl.NumberFormat().format(branch.stockUnits)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Batches</dt>
              <dd className="text-ink">{branch.batchCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Staff assigned</dt>
              <dd className="text-ink">{branch.staffCount}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Branch manager</h2>
          {manage ? (
            <div className="mt-3">
              <SearchableSelect
                options={managerOptions}
                value={branch.managerUserId ?? ''}
                onChange={(value) => void saveManager(value || null)}
                placeholder="Choose a manager"
                searchPlaceholder="Search staff…"
                emptyMessage="No active member matches."
                ariaLabel="Branch manager"
                clearable
                loading={directory.isLoading || busy === 'manager'}
                size="sm"
              />
              <p className="mt-2 text-xs text-slate">
                Assigning a manager also adds them to this branch.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink">{branch.managerName ?? 'No manager assigned'}</p>
          )}
        </Card>
      </div>

      {editing && manage ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Edit branch</h2>
          <p className="text-sm text-slate">
            The branch code must stay unique inside this organisation.
          </p>
          <div className="mt-4">
            <BranchForm
              branch={branch}
              onSaved={(saved: BranchRecord) => {
                setEditing(false);
                toast.success(`${saved.name} was updated.`);
                void refresh({ profile: true });
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <Users className="h-5 w-5 text-info" aria-hidden="true" />
              Branch staff
            </h2>
            <p className="text-sm text-slate">
              Only these members can work in this branch unless their permissions reach every branch.
            </p>
          </div>
          {manage && branch.status === 'ACTIVE' ? (
            <Button variant="outline" size="sm" onClick={() => setManaging((open) => !open)}>
              {managing ? 'Close' : 'Assign staff'}
            </Button>
          ) : null}
        </div>

        {managing && manage ? (
          <div className="mt-4 space-y-3">
            {directory.isLoading ? <SectionLoader label="Loading staff…" /> : null}
            {directory.error ? (
              <p className="text-sm text-danger">We could not load the staff directory.</p>
            ) : null}
            {directory.data ? (
              <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {directory.data
                  .filter((member) => member.status !== 'DEACTIVATED')
                  .map((member) => {
                    const checked = assigned.includes(member.userId);
                    return (
                      <li key={member.userId}>
                        <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() =>
                              setSelected(
                                checked
                                  ? assigned.filter((id) => id !== member.userId)
                                  : [...assigned, member.userId],
                              )
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-ink">
                              {member.name ?? member.email ?? 'Unnamed member'}
                            </span>
                            <span className="block truncate text-xs text-slate">
                              {ROLE_LABELS[member.role]}
                              {member.status !== 'ACTIVE' ? ` · ${member.status.toLowerCase()}` : ''}
                            </span>
                          </span>
                          {branch.managerUserId === member.userId ? (
                            <Badge status="info">Manager</Badge>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
              </ul>
            ) : null}
            <Button size="sm" disabled={busy === 'staff'} onClick={() => void saveStaff()}>
              {busy === 'staff' ? 'Saving…' : 'Save assignments'}
            </Button>
          </div>
        ) : null}

        {branch.staff.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Users}
            title="Nobody is assigned to this branch"
            description="Assign staff so they can record stock and sales here."
          />
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border">
            {branch.staff.map((member) => (
              <li key={member.userId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {member.name ?? member.email ?? 'Unnamed member'}
                    {member.isManager ? ' · Manager' : ''}
                  </p>
                  <p className="truncate text-xs text-slate">
                    {ROLE_LABELS[member.role]}
                    {member.memberStatus !== 'ACTIVE' ? ` · ${member.memberStatus.toLowerCase()}` : ''}
                  </p>
                </div>
                <Link
                  href={`/staff/${member.userId}`}
                  className="shrink-0 text-xs font-medium text-primary-700 hover:underline"
                >
                  Open staff record
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <BranchOperations branchId={branch.id} branchName={branch.name} />
    </div>
  );
}
