'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, RefreshCw, Send, Trash2 } from 'lucide-react';
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
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/services/api';
import { invitationApi } from '@/services/auth';
import { branchApi } from '@/services/platform';
import { ROLE_LABELS, STAFF_ROLES, type InvitableRole, type StaffInvitation } from '@/types/auth';
import type { BranchRecord } from '@/types/platform';

/** Roles whose access is decided by branch assignment, not by permission alone. */
const BRANCH_ROLES: InvitableRole[] = [
  'BRANCH_MANAGER',
  'PHARMACIST',
  'INVENTORY_OFFICER',
  'CASHIER',
  'INVENTORY_STAFF',
];

export function StaffInvite() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);

  const invitations = useQuery<StaffInvitation[]>({
    queryKey: ['invitations', 'list'],
    meta: { silent: true },
    queryFn: () => invitationApi.list(),
  });

  const branches = useQuery<BranchRecord[]>({
    queryKey: ['branches', 'list'],
    meta: { silent: true },
    queryFn: () => branchApi.list(),
  });

  const canConfigurePermissions = can('staff:permissions');
  const roleOptions = STAFF_ROLES.filter(
    (value) => value !== 'ADMIN' || canConfigurePermissions,
  ).map((value) => ({ value, label: ROLE_LABELS[value] }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setDevInviteUrl(null);

    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (!role) next.role = 'Choose the role this person will hold.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    try {
      const created = await invitationApi.create({
        email: email.trim(),
        role: role as InvitableRole,
        branchIds,
      });
      toast.success(
        created.delivered
          ? `Invitation sent to ${created.email}.`
          : `Invitation created for ${created.email}, but the email could not be delivered.`,
      );
      if (created.devInviteUrl) setDevInviteUrl(created.devInviteUrl);
      setEmail('');
      setBranchIds([]);
      await queryClient.invalidateQueries({ queryKey: ['invitations'] });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.field) setErrors({ [error.field]: error.message });
        else toast.error(error.message);
      } else {
        toast.error('We could not send the invitation. Check your connection and try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const resend = async (id: string) => {
    setBusyId(id);
    try {
      const resent = await invitationApi.resend(id);
      toast.success(
        resent.delivered
          ? 'A fresh invitation link was sent.'
          : 'A fresh link was created, but the email could not be delivered.',
      );
      if (resent.devInviteUrl) setDevInviteUrl(resent.devInviteUrl);
      await queryClient.invalidateQueries({ queryKey: ['invitations'] });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'We could not resend that invitation.');
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (id: string) => {
    setBusyId(id);
    try {
      await invitationApi.revoke(id);
      toast.success('Invitation revoked.');
      await queryClient.invalidateQueries({ queryKey: ['invitations'] });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'We could not revoke that invitation.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = (invitations.data ?? []).filter((invitation) => invitation.status === 'PENDING');
  const settled = (invitations.data ?? []).filter((invitation) => invitation.status !== 'PENDING');
  const activeBranches = (branches.data ?? []).filter((branch) => branch.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invite staff"
        description="Send an email invitation. The person sets their own password and receives the role and branches you choose here."
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Send className="h-5 w-5 text-info" aria-hidden="true" />
            New invitation
          </h2>

          <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
            <Field label="Email address" htmlFor="invite-email" required error={errors.email}>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@pharmacy.com"
                autoComplete="off"
              />
            </Field>

            <Field label="Role" required error={errors.role}>
              <SearchableSelect
                options={roleOptions}
                value={role}
                onChange={setRole}
                placeholder="Choose a role"
                searchPlaceholder="Search roles…"
                emptyMessage="No role matches that search."
                ariaLabel="Role"
                error={errors.role}
              />
            </Field>

            <div>
              <p className="mb-1 text-xs font-medium text-ink">Branches</p>
              {branches.isLoading ? <SectionLoader label="Loading branches…" className="py-2" /> : null}
              {activeBranches.length === 0 && !branches.isLoading ? (
                <p className="text-xs text-slate">No active branch to assign yet.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {activeBranches.map((branch) => {
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
                            <span className="block text-xs text-slate">{branch.code}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-1 text-xs text-slate">
                {role && BRANCH_ROLES.includes(role as InvitableRole)
                  ? 'This role works inside a branch, so choose at least one.'
                  : 'Leave empty for a role that works across every branch.'}
              </p>
            </div>

            {devInviteUrl ? (
              <p className="break-all rounded-md border border-border bg-background p-3 text-xs text-slate">
                Development link (email transport is logging only):{' '}
                <span className="font-medium text-ink">{devInviteUrl}</span>
              </p>
            ) : null}

            <Button type="submit" disabled={sending}>
              {sending ? 'Sending invitation…' : 'Send invitation'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Mail className="h-5 w-5 text-info" aria-hidden="true" />
            Pending invitations
          </h2>

          {invitations.isLoading ? <SectionLoader label="Loading invitations…" /> : null}
          {invitations.error ? (
            <p className="mt-4 text-sm text-danger">We could not load the invitation list.</p>
          ) : null}

          {!invitations.isLoading && pending.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Mail}
              title="No pending invitations"
              description="Invitations you send appear here until they are accepted, revoked or expire."
            />
          ) : null}

          {pending.length > 0 ? (
            <ul className="mt-4 divide-y divide-border rounded-md border border-border">
              {pending.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{invitation.email}</p>
                    <p className="text-xs text-slate">
                      {ROLE_LABELS[invitation.role]} · expires{' '}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                      {invitation.branchNames.length > 0
                        ? ` · ${invitation.branchNames.join(', ')}`
                        : ''}
                    </p>
                    {invitation.resendCount > 0 ? (
                      <p className="text-xs text-slate">Sent {invitation.resendCount + 1} times</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => void resend(invitation.id)}
                      disabled={busyId === invitation.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-ink hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Resend
                    </button>
                    <button
                      type="button"
                      onClick={() => void revoke(invitation.id)}
                      disabled={busyId === invitation.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-slate hover:bg-slate-50 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {settled.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-xs font-medium uppercase text-slate">Recent</h3>
              <ul className="mt-2 space-y-1">
                {settled.slice(0, 5).map((invitation) => (
                  <li key={invitation.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-ink">{invitation.email}</span>
                    <Badge status={invitation.status === 'ACCEPTED' ? 'success' : 'neutral'}>
                      {invitation.status === 'ACCEPTED' ? 'Accepted' : invitation.status.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
