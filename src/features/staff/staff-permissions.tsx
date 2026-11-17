'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionLoader } from '@/components/ui/loading';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/services/api';
import { permissionApi } from '@/services/platform';
import type { PermissionCatalogue, PermissionEffect } from '@/types/platform';

type Choice = 'INHERIT' | PermissionEffect;

interface StaffPermissionsProps {
  userId: string;
  memberName: string;
}

/**
 * Grants and denials on top of a member's role.
 *
 * The role decides the baseline; a grant adds one permission the role does not
 * give, a denial removes one it does. Both are recorded in the audit trail.
 */
export function StaffPermissions({ userId, memberName }: StaffPermissionsProps) {
  const catalogue = useQuery<PermissionCatalogue>({
    queryKey: ['permissions', 'catalogue'],
    meta: { silent: true },
    queryFn: () => permissionApi.catalogue(),
  });

  const overrides = useQuery({
    queryKey: ['permissions', 'member', userId],
    meta: { silent: true },
    queryFn: () => permissionApi.memberOverrides(userId),
  });

  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!overrides.data) return;
    const next: Record<string, Choice> = {};
    for (const override of overrides.data) next[override.permission] = override.effect;
    setChoices(next);
  }, [overrides.data]);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionCatalogue['permissions']>();
    for (const permission of catalogue.data?.permissions ?? []) {
      const bucket = map.get(permission.group);
      if (bucket) bucket.push(permission);
      else map.set(permission.group, [permission]);
    }
    return [...map.entries()];
  }, [catalogue.data]);

  const changed = Object.values(choices).filter((choice) => choice !== 'INHERIT').length;

  const save = async () => {
    setSaving(true);
    try {
      const grants = Object.entries(choices)
        .filter(([, choice]) => choice === 'GRANT')
        .map(([key]) => key);
      const denies = Object.entries(choices)
        .filter(([, choice]) => choice === 'DENY')
        .map(([key]) => key);
      await permissionApi.setMemberOverrides(userId, { grants, denies });
      toast.success(`Permissions updated for ${memberName}.`);
      await overrides.refetch();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'We could not save these permissions.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ShieldCheck className="h-5 w-5 text-info" aria-hidden="true" />
            Personal permissions
          </h2>
          <p className="text-sm text-slate">
            Applied on top of the role. A grant adds a permission; a denial removes one the role
            would otherwise give.
          </p>
        </div>
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save permissions'}
        </Button>
      </div>

      {catalogue.isLoading || overrides.isLoading ? (
        <SectionLoader label="Loading permission catalogue…" />
      ) : null}

      {catalogue.error || overrides.error ? (
        <p className="mt-4 text-sm text-danger">
          We could not load the permission catalogue. The API must be reachable.
        </p>
      ) : null}

      {catalogue.data ? (
        <div className="mt-4 space-y-5">
          {groups.map(([group, permissions]) => (
            <div key={group}>
              <h3 className="text-xs font-medium uppercase text-slate">{group}</h3>
              <ul className="mt-2 grid gap-3 md:grid-cols-2">
                {permissions.map((permission) => {
                  const choice = choices[permission.key] ?? 'INHERIT';
                  return (
                    <li key={permission.key} className="rounded-md border border-border p-3">
                      <p className="text-sm font-medium text-ink">{permission.label}</p>
                      <p className="text-xs text-slate">{permission.description}</p>
                      <div className="mt-2">
                        <SearchableSelect
                          options={[
                            { value: 'INHERIT', label: 'Follow role' },
                            { value: 'GRANT', label: 'Always allow' },
                            { value: 'DENY', label: 'Always deny' },
                          ]}
                          value={choice}
                          onChange={(value) =>
                            setChoices((current) => ({
                              ...current,
                              [permission.key]: value as Choice,
                            }))
                          }
                          ariaLabel={`${permission.label} for ${memberName}`}
                          size="sm"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-xs text-slate">{changed} permission(s) overridden for this member.</p>
        </div>
      ) : null}
    </Card>
  );
}
