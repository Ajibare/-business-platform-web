'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { EmptyState } from '@/components/ui/empty-state';
import type { BranchRecord } from '@/types/platform';
import { BranchForm } from './branch-form';

export function BranchCreate() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { can } = usePermissions();

  if (!can('branch:manage')) {
    return (
      <div className="space-y-6">
        <PageHeader title="Create branch" />
        <Card className="p-6">
          <EmptyState
            title="You cannot create branches"
            description="Creating and editing branches requires the branch management permission. Ask the pharmacy owner."
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

  const handleSaved = async (branch: BranchRecord) => {
    toast.success(`${branch.name} was created.`);
    // The switcher reads the profile, so the new branch must appear there.
    await refreshProfile();
    router.push(`/branches/${branch.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create branch"
        description="A branch has its own stock, sales and staff. The medicine catalogue stays shared."
        actions={
          <Link
            href="/branches"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All branches
          </Link>
        }
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">Branch details</h2>
        <p className="text-sm text-slate">
          The code is how this branch is identified in reports and transfers.
        </p>
        <div className="mt-4">
          <BranchForm onSaved={(branch) => void handleSaved(branch)} />
        </div>
      </Card>
    </div>
  );
}
