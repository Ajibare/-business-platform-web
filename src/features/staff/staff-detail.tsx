'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, History, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SectionLoader } from '@/components/ui/loading';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/services/api';
import { branchApi, staffApi } from '@/services/platform';
import { ROLE_LABELS, STAFF_ROLES, type Role } from '@/types/auth';
import type { BranchRecord, StaffActivityEntry, StaffDetail as StaffDetailRecord } from '@/types/platform';
import { MEMBER_STATUS_LABELS, MEMBER_STATUS_TONES } from './labels';
import { StaffPermissions } from './staff-permissions';

export function StaffDetail({ userId }: { userId: string }) {
  const { profile, refreshProfile } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const detail = useQuery<StaffDetailRecord>({
    queryKey: ['staff', 'detail', userId],
    meta: { silent: true },
    queryFn: () => staffApi.get(userId),
  });

  const branches = useQuery<BranchRecord[]>({
    queryKey: ['branches', 'list'],
    meta: { silent: true },
    queryFn: () => branchApi.list(),
  });

  const activity = useQuery<StaffActivityEntry[]>({
    queryKey: ['staff', 'activity', userId],
    meta: { silent: true },
    enabled: can('audit:read'),
    queryFn: () => staffApi.activity(userId, 50),
  });

  const member = detail.data;
  const isSelf = profile?.user.id === userId;
  const manage = can('staff:manage');

  const refresh = async (options: { profile?: boolean } = {}) => {
    await queryClient.invalidateQueries({ queryKey: ['staff'] });
    await queryClient.invalidateQueries({ queryKey: ['branches'] });
    if (options.profile) await refreshProfile();
  };

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(message);
      await refresh({ profile: true });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'That action could not be completed.');
    } finally {
      setBusy(null);
      setConfirmRemove(false);
    }
  };

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Staff member" description="Loading the staff record…" />
        <Card className="p-6">
          <SectionLoader label="Loading staff record…" className="py-8" />
        </Card>
      </div>
    );
  }

  if (detail.error || !member) {
    return (
      <div className="space-y-6">
        <PageHeader title="Staff member" />
        <Card className="p-6">
          <EmptyState
            icon={UserCog}
            title="This staff record is not available"
            description={
              detail.error instanceof Error
                ? detail.error.message
                : 'The member may have been removed from this organisation.'
            }
            action={
              <Link
                href="/staff"
                className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-background"
              >
                Back to staff
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const activeBranches = (branches.data ?? []).filter(
    (branch) => branch.status === 'ACTIVE' || member.branches.some((own) => own.id === branch.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={member.name ?? member.email ?? 'Staff member'}
        description={member.email ?? member.phone ?? 'No contact recorded.'}
        actions={
          <Link
            href="/staff"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All staff
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge status="neutral">{ROLE_LABELS[member.role]}</Badge>
        <Badge status={MEMBER_STATUS_TONES[member.status]}>
          {MEMBER_STATUS_LABELS[member.status]}
        </Badge>
        {member.managedBranchIds.length > 0 ? (
          <Badge status="info">Branch manager</Badge>
        ) : null}
        {isSelf ? <Badge status="neutral">This is you</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Membership</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Joined</dt>
              <dd className="text-ink">{new Date(member.joinedAt).toLocaleDateString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Last sign-in</dt>
              <dd className="text-ink">
                {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString() : 'Never'}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate">Phone</dt>
              <dd className="text-ink">{member.phone ?? '—'}</dd>
            </div>
            {member.statusReason ? (
              <div>
                <dt className="text-slate">Status note</dt>
                <dd className="text-ink">{member.statusReason}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Branches</h2>
          {member.branches.length === 0 ? (
            <p className="mt-3 text-sm text-slate">
              {member.role === 'OWNER'
                ? 'Owners reach every branch automatically.'
                : 'No branch assigned. This member only sees what their permissions allow.'}
            </p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {member.branches.map((branch) => (
                <li key={branch.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink">{branch.name}</span>
                  <span className="text-xs text-slate">
                    {branch.code}
                    {member.managedBranchIds.includes(branch.id) ? ' · manager' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Effective permissions</h2>
          <p className="mt-1 text-xs text-slate">
            {member.permissions.length} permission{member.permissions.length === 1 ? '' : 's'} from
            the role and personal overrides.
          </p>
          <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-slate">
            {member.permissions.map((permission) => (
              <li key={permission} className="font-mono">
                {permission}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {manage && !isSelf ? (
        <EditMemberCard member={member} branches={activeBranches} onSaved={() => void refresh()} />
      ) : null}

      {manage && !isSelf ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Account access</h2>
          <p className="text-sm text-slate">
            Suspending or deactivating ends access on the member's next request. Nothing they
            recorded is deleted.
          </p>
          <div className="mt-4 max-w-md">
            <Field label="Reason (optional)" htmlFor="staff-reason" hint="Shown to administrators in the audit trail.">
              <Input
                id="staff-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="On leave until March"
                autoComplete="off"
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {member.status !== 'ACTIVE' ? (
              <Button
                size="sm"
                disabled={busy === 'activate'}
                onClick={() =>
                  void run('activate', () => staffApi.activate(member.userId), 'Access restored.')
                }
              >
                {busy === 'activate' ? 'Saving…' : 'Activate'}
              </Button>
            ) : null}
            {member.status === 'ACTIVE' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy === 'suspend'}
                onClick={() =>
                  void run(
                    'suspend',
                    () => staffApi.suspend(member.userId, reason.trim() || undefined),
                    'Member suspended.',
                  )
                }
              >
                {busy === 'suspend' ? 'Saving…' : 'Suspend'}
              </Button>
            ) : null}
            {member.status !== 'DEACTIVATED' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy === 'deactivate'}
                onClick={() =>
                  void run(
                    'deactivate',
                    () => staffApi.deactivate(member.userId, reason.trim() || undefined),
                    'Member deactivated.',
                  )
                }
              >
                {busy === 'deactivate' ? 'Saving…' : 'Deactivate'}
              </Button>
            ) : null}
            <Button
              variant="destructive"
              size="sm"
              disabled={busy === 'remove'}
              onClick={() => {
                if (!confirmRemove) {
                  setConfirmRemove(true);
                  return;
                }
                void run(
                  'remove',
                  () => staffApi.remove(member.userId, reason.trim() || undefined),
                  'Access removed.',
                );
              }}
            >
              {busy === 'remove'
                ? 'Removing…'
                : confirmRemove
                  ? 'Confirm removal'
                  : 'Remove access'}
            </Button>
          </div>
          {member.role === 'OWNER' ? (
            <p className="mt-3 text-xs text-slate">
              The owner role cannot be changed or removed here. Transfer ownership is a separate,
              deliberate action.
            </p>
          ) : null}
        </Card>
      ) : null}

      {can('staff:permissions') && !isSelf ? (
        <StaffPermissions
          userId={member.userId}
          memberName={member.name ?? member.email ?? 'this member'}
        />
      ) : null}

      <Card className="p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <History className="h-5 w-5 text-info" aria-hidden="true" />
          Recent activity
        </h2>
        <p className="text-sm text-slate">Recorded actions, newest first.</p>

        {!can('audit:read') ? (
          <p className="mt-4 text-sm text-slate">
            Viewing activity requires the audit permission.
          </p>
        ) : null}
        {activity.isLoading ? <SectionLoader label="Loading activity…" /> : null}
        {activity.error ? (
          <p className="mt-4 text-sm text-danger">We could not load this member's activity.</p>
        ) : null}
        {activity.data && activity.data.length === 0 ? (
          <p className="mt-4 text-sm text-slate">Nothing recorded for this member yet.</p>
        ) : null}
        {activity.data && activity.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border">
            {activity.data.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{humanise(entry.action)}</p>
                  <p className="truncate text-xs text-slate">
                    {entry.entityType ?? 'Record'}
                    {entry.entityId ? ` · ${entry.entityId}` : ''}
                  </p>
                </div>
                <p className="text-xs text-slate">{new Date(entry.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}

function EditMemberCard({
  member,
  branches,
  onSaved,
}: {
  member: StaffDetailRecord;
  branches: BranchRecord[];
  onSaved: () => void;
}) {
  const [name, setName] = useState(member.name ?? '');
  const [phone, setPhone] = useState(member.phone ?? '');
  const [role, setRole] = useState<Role>(member.role);
  const [branchIds, setBranchIds] = useState<string[]>(member.branches.map((branch) => branch.id));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // The API may answer with a new role or branch set; keep the form in step.
  useEffect(() => {
    setName(member.name ?? '');
    setPhone(member.phone ?? '');
    setRole(member.role);
    setBranchIds(member.branches.map((branch) => branch.id));
  }, [member]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Enter a name of at least 2 characters.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await staffApi.update(member.userId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        ...(member.role === 'OWNER' ? {} : { role }),
        branchIds,
      });
      toast.success('Staff details saved.');
      onSaved();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.field) setErrors({ [error.field]: error.message });
        else toast.error(error.message);
      } else {
        toast.error('We could not save these details.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-ink">Staff details</h2>
      <p className="text-sm text-slate">
        Changing the role changes the baseline permissions; personal overrides stay in place.
      </p>

      <form onSubmit={save} className="mt-4 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="member-name" required error={errors.name}>
            <Input id="member-name" value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="member-phone">
            <Input
              id="member-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="0803 123 4567"
            />
          </Field>
          <Field label="Role" hint={member.role === 'OWNER' ? 'Ownership does not move by edit.' : undefined}>
            <SearchableSelect
              options={STAFF_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
              value={role}
              onChange={(value) => setRole(value as Role)}
              disabled={member.role === 'OWNER'}
              ariaLabel="Role"
            />
          </Field>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-ink">Branches</p>
          {branches.length === 0 ? (
            <p className="text-xs text-slate">No active branch to assign.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {branches.map((branch) => {
                const checked = branchIds.includes(branch.id);
                return (
                  <li key={branch.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() =>
                          setBranchIds(
                            checked
                              ? branchIds.filter((id) => id !== branch.id)
                              : [...branchIds, branch.id],
                          )
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{branch.name}</span>
                        <span className="block text-xs text-slate">
                          {branch.code}
                          {branch.status !== 'ACTIVE' ? ' · inactive' : ''}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save details'}
        </Button>
      </form>
    </Card>
  );
}

/** `SALE_RECORDED` becomes `Sale recorded`. */
function humanise(action: string): string {
  const words = action.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
