'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SectionLoader } from '@/components/ui/loading';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/services/api';
import { permissionApi } from '@/services/platform';
import type { PermissionCatalogue, RolePermissions } from '@/types/platform';
import type { Role } from '@/types/auth';

/**
 * What each role may do in this organisation.
 *
 * The owner row is shown but never editable: the API resolves the owner to the
 * full catalogue so a workspace cannot lock itself out. Edits apply to everyone
 * holding the role, which the screen states plainly before saving.
 */
export function RolePermissionsMatrix() {
  const { refreshProfile } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role>('BRANCH_MANAGER');
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const catalogue = useQuery<PermissionCatalogue>({
    queryKey: ['permissions', 'catalogue'],
    meta: { silent: true },
    queryFn: () => permissionApi.catalogue(),
  });

  const roles = useQuery<RolePermissions[]>({
    queryKey: ['permissions', 'roles'],
    meta: { silent: true },
    queryFn: () => permissionApi.roles(),
  });

  const selected = roles.data?.find((entry) => entry.role === role) ?? null;
  const defaults = catalogue.data?.roles.find((entry) => entry.role === role)?.defaults ?? [];
  const effective = draft ?? selected?.permissions ?? [];

  useEffect(() => {
    setDraft(null);
  }, [role]);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionCatalogue['permissions']>();
    for (const permission of catalogue.data?.permissions ?? []) {
      const bucket = map.get(permission.group);
      if (bucket) bucket.push(permission);
      else map.set(permission.group, [permission]);
    }
    return [...map.entries()];
  }, [catalogue.data]);

  const editable = can('staff:permissions') && selected?.editable === true;
  const dirty =
    selected !== null &&
    (effective.length !== selected.permissions.length ||
      effective.some((key) => !selected.permissions.includes(key)));

  const toggle = (key: string) => {
    if (!editable) return;
    setDraft(effective.includes(key) ? effective.filter((entry) => entry !== key) : [...effective, key]);
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await permissionApi.setRole(selected.role, effective);
      toast.success(`${selected.label} permissions saved.`);
      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
      // The signed-in member may have just changed their own role's access.
      await refreshProfile();
      setDraft(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'We could not save that role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & permissions"
        description="Every endpoint checks a permission, not a role name. Adjust what each role may do, or override a single member's access from their staff record."
      />

      {catalogue.error || roles.error ? (
        <Card className="p-6">
          <p className="text-sm text-danger">
            We could not load the permission matrix. Check that the API is reachable and try again.
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              void catalogue.refetch();
              void roles.refetch();
            }}
          >
            Retry
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card className="p-3">
          <p className="px-2 py-1 text-xs font-medium uppercase text-slate">Roles</p>
          <ul className="space-y-1">
            {(roles.data ?? []).map((entry) => (
              <li key={entry.role}>
                <button
                  type="button"
                  onClick={() => setRole(entry.role)}
                  aria-pressed={role === entry.role}
                  className={
                    role === entry.role
                      ? 'flex w-full items-center justify-between gap-2 rounded-md bg-primary-50 px-3 py-2 text-left text-sm font-medium text-primary-700'
                      : 'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-slate-100'
                  }
                >
                  <span>{entry.label}</span>
                  <span className="text-xs text-slate">{entry.permissions.length}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          {roles.isLoading || catalogue.isLoading ? (
            <SectionLoader label="Loading the permission matrix…" />
          ) : null}

          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                    <ShieldCheck className="h-5 w-5 text-info" aria-hidden="true" />
                    {selected.label}
                  </h2>
                  <p className="text-sm text-slate">
                    {selected.editable
                      ? 'Changes apply to everyone holding this role.'
                      : 'The owner always holds every permission.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status="neutral">{effective.length} granted</Badge>
                  {selected.editable ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!editable || saving}
                        onClick={() => setDraft([...defaults])}
                      >
                        Use defaults
                      </Button>
                      <Button size="sm" disabled={!editable || saving || !dirty} onClick={() => void save()}>
                        {saving ? 'Saving…' : 'Save role'}
                      </Button>
                    </>
                  ) : (
                    <Badge status="info">
                      <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                      Read-only
                    </Badge>
                  )}
                </div>
              </div>

              {!can('staff:permissions') ? (
                <p className="mt-4 rounded-md border border-border bg-background p-3 text-sm text-slate">
                  You can view this page, but changing permissions requires the configure
                  permissions ability.
                </p>
              ) : null}

              <div className="mt-5 space-y-5">
                {groups.map(([group, permissions]) => (
                  <div key={group}>
                    <h3 className="text-xs font-medium uppercase text-slate">{group}</h3>
                    <ul className="mt-2 grid gap-2 md:grid-cols-2">
                      {permissions.map((permission) => {
                        const checked = effective.includes(permission.key);
                        return (
                          <li key={permission.key}>
                            <label
                              className={
                                editable
                                  ? 'flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-slate-50'
                                  : 'flex items-start gap-3 rounded-md border border-border p-3 opacity-80'
                              }
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4"
                                checked={checked}
                                disabled={!editable}
                                onChange={() => toggle(permission.key)}
                              />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-ink">
                                  {permission.label}
                                </span>
                                <span className="block text-xs text-slate">
                                  {permission.description}
                                </span>
                                <span className="mt-1 block font-mono text-[11px] text-slate">
                                  {permission.key}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
