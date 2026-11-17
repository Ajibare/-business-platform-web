'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SectionLoader } from '@/components/ui/loading';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/services/api';
import { branchApi } from '@/services/platform';
import type { BranchRecord } from '@/types/platform';

export function BranchList() {
  const { can } = usePermissions();
  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const branches = useQuery<BranchRecord[]>({
    queryKey: ['branches', 'list'],
    meta: { silent: true },
    queryFn: () => branchApi.list(),
  });

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const rows = branches.data ?? [];
    if (!needle) return rows;
    return rows.filter((branch) =>
      `${branch.name} ${branch.code} ${branch.managerName ?? ''}`.toLowerCase().includes(needle),
    );
  }, [branches.data, search]);

  const toggleStatus = async (branch: BranchRecord) => {
    setBusyId(branch.id);
    try {
      const updated =
        branch.status === 'ACTIVE'
          ? await branchApi.deactivate(branch.id)
          : await branchApi.activate(branch.id);
      toast.success(
        updated.status === 'ACTIVE'
          ? `${updated.name} is now open for trading.`
          : `${updated.name} was closed. Its records are kept.`,
      );
      await queryClient.invalidateQueries({ queryKey: ['branches'] });
      // The switcher and every branch-scoped screen read the profile.
      await refreshProfile();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'We could not change that branch. Try again.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const manage = can('branch:manage');
  const activeCount = (branches.data ?? []).filter((branch) => branch.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Every location in this pharmacy organisation. Stock and sales are kept per branch."
        actions={
          manage ? (
            <Link
              href="/branches/new"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create branch
            </Link>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm font-medium text-slate">Branches</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{branches.data?.length ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-slate">Active</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm font-medium text-slate">Staff assigned</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {(branches.data ?? []).reduce((total, branch) => total + branch.staffCount, 0)}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Building2 className="h-5 w-5 text-info" aria-hidden="true" />
            All branches
          </h2>
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, code or manager"
              aria-label="Search branches"
              className="pl-9"
            />
          </div>
        </div>

        {branches.isLoading ? <SectionLoader label="Loading branches…" /> : null}

        {branches.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {branches.error instanceof Error ? branches.error.message : 'Unable to load branches.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => branches.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {branches.data && branches.data.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Building2}
            title="No branches yet"
            description="Create the pharmacy's first branch. Stock, sales and staff are always recorded against one."
            action={
              manage ? (
                <Link
                  href="/branches/new"
                  className="inline-flex h-9 items-center rounded-md bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Create branch
                </Link>
              ) : undefined
            }
          />
        ) : null}

        {visible.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {visible.map((branch) => (
              <li
                key={branch.id}
                className="rounded-md border border-border p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/branches/${branch.id}`}
                        className="text-sm font-semibold text-ink hover:text-primary-700"
                      >
                        {branch.name}
                      </Link>
                      <Badge status="neutral">{branch.code}</Badge>
                      {branch.isDefault ? <Badge status="info">Default</Badge> : null}
                      <Badge status={branch.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {branch.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate">
                      {branch.managerName ? `Manager: ${branch.managerName}` : 'No manager assigned'}
                      {branch.address ? ` · ${branch.address}` : ''}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {branch.staffCount} staff
                      </span>
                      <span>{branch.batchCount} batches</span>
                      <span>{formatQuantity(branch.stockUnits)} units in stock</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/branches/${branch.id}`}
                      className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-ink hover:bg-background"
                    >
                      Open
                    </Link>
                    {manage ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === branch.id}
                        onClick={() => void toggleStatus(branch)}
                      >
                        {busyId === branch.id
                          ? 'Saving…'
                          : branch.status === 'ACTIVE'
                            ? 'Deactivate'
                            : 'Activate'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {branches.data && branches.data.length > 0 && visible.length === 0 ? (
          <p className="mt-4 text-sm text-slate">No branch matches that search.</p>
        ) : null}
      </Card>
    </div>
  );
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat().format(value);
}
