'use client';

import Link from 'next/link';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { ImportJobDetail } from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImportErrorReport } from './import-error-report';

export interface ImportResultSummaryProps {
  job: ImportJobDetail;
  onStartAgain?: () => void;
}

/**
 * Final summary after confirmation. Reports exactly how many rows were
 * imported and how many failed, and links to the affected records.
 */
export function ImportResultSummary({ job, onStartAgain }: ImportResultSummaryProps) {
  const succeeded = job.status === 'COMPLETED';
  const hasFailures = job.failedRows > 0 || job.invalidRows > 0 || job.duplicateRows > 0;

  return (
    <div className="space-y-4">
      <Alert
        tone={succeeded ? 'success' : 'warning'}
        title={succeeded ? 'Import completed' : 'Import completed with issues'}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
          <span>
            {job.importedRows} of {job.totalRows} row(s) imported from {job.filename}.
          </span>
        </div>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs uppercase text-slate">Rows in file</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{job.totalRows}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs uppercase text-slate">Imported</p>
          <p className="mt-1 text-2xl font-semibold text-success">{job.importedRows}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs uppercase text-slate">Failed</p>
          <p className="mt-1 text-2xl font-semibold text-danger">{job.failedRows}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs uppercase text-slate">Invalid</p>
          <p className="mt-1 text-2xl font-semibold text-danger">{job.invalidRows}</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-3">
          <p className="text-xs uppercase text-slate">Duplicates</p>
          <p className="mt-1 text-2xl font-semibold text-discrepancy">{job.duplicateRows}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge status={succeeded ? 'success' : 'warning'}>{job.status.replace(/_/g, ' ')}</Badge>
        {hasFailures ? <ImportErrorReport jobId={job.id} label="Download rows needing attention" /> : null}
        {job.type === 'PRODUCTS' || job.type === 'INITIAL_STOCK' ? (
          <Link
            href="/products/pharmacy"
            className="inline-flex h-8 items-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-background"
          >
            View catalogue
          </Link>
        ) : null}
        {job.type === 'BATCHES' || job.type === 'INITIAL_STOCK' ? (
          <Link
            href="/products/pharmacy/batches"
            className="inline-flex h-8 items-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-background"
          >
            View batches
          </Link>
        ) : null}
        {onStartAgain ? (
          <Button variant="ghost" size="sm" onClick={onStartAgain}>
            <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
            Start another import
          </Button>
        ) : null}
      </div>
    </div>
  );
}
