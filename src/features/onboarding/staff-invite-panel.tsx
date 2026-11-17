'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { SectionLoader } from '@/components/ui/loading';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/toast';
import { StaffInviteValues, staffInviteSchema } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { invitationApi } from '@/services/auth';
import { ROLE_LABELS, type StaffInvitation } from '@/types/auth';

const ROLE_OPTIONS = [
  { value: 'MANAGER', label: 'Manager — can run the pharmacy and invite inventory staff' },
  { value: 'INVENTORY_STAFF', label: 'Inventory staff — can record stock and counts' },
  { value: 'READ_ONLY', label: 'Read-only — can view stock and reports' },
];

/**
 * Invites staff and lists what is still pending. Only the workspace the user is
 * signed into can be invited to; the role comes from this form and is applied
 * by the API from the invitation record.
 */
export function StaffInvitePanel() {
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StaffInviteValues>({
    resolver: zodResolver(staffInviteSchema),
    defaultValues: { email: '', role: 'INVENTORY_STAFF' },
  });

  const loadInvitations = useCallback(async () => {
    try {
      const result = await invitationApi.list();
      setInvitations(result);
    } catch (error) {
      if (error instanceof ApiError) setFormError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const onSubmit = async (values: StaffInviteValues) => {
    setFormError(null);
    setDevInviteUrl(null);
    try {
      const created = await invitationApi.create({ email: values.email, role: values.role });
      if (created.delivered) {
        toast.success(`Invitation sent to ${created.email}.`);
      } else {
        toast.error(
          `Invitation created for ${created.email}, but the email could not be delivered.`,
        );
      }
      if (created.devInviteUrl) setDevInviteUrl(created.devInviteUrl);
      reset({ email: '', role: values.role });
      await loadInvitations();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'We could not send the invitation. Check your connection and try again.',
      );
    }
  };

  const revoke = async (id: string) => {
    setRevokingId(id);
    setFormError(null);
    try {
      await invitationApi.revoke(id);
      toast.success('Invitation revoked.');
      await loadInvitations();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'We could not revoke that invitation.',
      );
    } finally {
      setRevokingId(null);
    }
  };

  const pending = invitations.filter((invitation) => invitation.status === 'PENDING');
  const sent = invitations.filter((invitation) => invitation.status !== 'PENDING').slice(0, 3);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <AuthInput
          label="Email address"
          type="email"
          autoComplete="off"
          placeholder="colleague@pharmacy.com"
          hint="Invitations are sent by email. The link expires in 7 days and works once."
          error={errors.email?.message}
          {...register('email')}
        />

        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <SearchableSelect
              label="Role"
              value={field.value ?? ''}
              onChange={field.onChange}
              options={ROLE_OPTIONS}
              placeholder="Select a role"
              searchPlaceholder="Search roles…"
              emptyMessage="No role matches that search."
              error={errors.role?.message}
            />
          )}
        />

        <AuthErrorMessage>{formError}</AuthErrorMessage>
        {devInviteUrl ? (
          <p className="break-all rounded-md border border-border bg-background p-3 text-xs text-slate">
            Development link (email transport is logging only):{' '}
            <span className="font-medium text-ink">{devInviteUrl}</span>
          </p>
        ) : null}

        <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Sending invitation…">
          Send invitation
        </AuthSubmitButton>
      </form>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-ink">Pending invitations</h3>
        {isLoading ? (
          <SectionLoader label="Loading invitations…" className="py-4" />
        ) : pending.length === 0 ? (
          <p className="text-sm text-slate">
            No one has been invited yet. You can skip this step and invite staff later.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {pending.map((invitation) => (
              <li key={invitation.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{invitation.email}</p>
                  <p className="text-xs text-slate">
                    {ROLE_LABELS[invitation.role]} · expires{' '}
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revoke(invitation.id)}
                  disabled={revokingId === invitation.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-slate transition-colors hover:bg-slate-50 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {revokingId === invitation.id ? 'Revoking…' : 'Revoke'}
                </button>
              </li>
            ))}
          </ul>
        )}

        {sent.length > 0 ? (
          <p className="text-xs text-slate">
            {sent.length} previous {sent.length === 1 ? 'invitation has' : 'invitations have'} been
            accepted, revoked or expired.
          </p>
        ) : null}
      </div>
    </div>
  );
}
