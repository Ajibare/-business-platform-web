'use client';

import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { ImportJob } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineLoader, SectionLoader } from '@/components/ui/loading';
import { ImportWizard } from '@/components/imports/import-wizard';
import { formatDateTime } from '@/lib/format';

const statusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'success' as const;
    case 'COMPLETED_WITH_ERRORS':
      return 'warning' as const;
    case 'FAILED':
      return 'danger' as const;
    case 'VALIDATED':
      return 'info' as const;
    default:
      return 'neutral' as const;
  }
};

export function BulkImport() {
  const recent = useQuery<ImportJob[]>({
    queryKey: ['pharmacy', 'imports', 'recent'],
    // The history list prints its own failure.
    meta: { silent: true },
    queryFn: () => apiFetch<ImportJob[]>('/pharmacy/imports?limit=5'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <FileSpreadsheet className="h-6 w-6 text-primary-700" aria-hidden="true" />
          Bulk import
        </h1>
        <p className="text-sm text-slate">
          Import products, batches or opening stock from a CSV file. Every row is validated before
          anything is written, and invalid rows are reported.
        </p>
      </div>

      <ImportWizard />

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Recent imports</h2>
          <Button variant="outline" size="sm" onClick={() => recent.refetch()} disabled={recent.isFetching}>
            {recent.isFetching ? <InlineLoader label="Refreshing…" /> : 'Refresh'}
          </Button>
        </div>

        {recent.isLoading ? <SectionLoader label="Loading import history…" /> : null}

        {recent.error ? (
          <p className="mt-4 text-sm text-danger">
            {recent.error instanceof Error ? recent.error.message : 'Unable to load import history.'}
          </p>
        ) : null}

        {recent.data && recent.data.length === 0 ? (
          <p className="mt-4 text-sm text-slate">No imports have been run yet.</p>
        ) : null}

        {recent.data && recent.data.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {recent.data.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {job.filename} · {job.type.replace(/_/g, ' ').toLowerCase()}
                  </p>
                  <p className="text-xs text-slate">
                    {formatDateTime(job.createdAt)} · {job.totalRows} row(s) · {job.importedRows}{' '}
                    imported · {job.failedRows} failed
                  </p>
                </div>
                <Badge status={statusBadge(job.status)}>{job.status.replace(/_/g, ' ')}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}
