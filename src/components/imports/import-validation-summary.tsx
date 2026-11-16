'use client';

import { ImportJobDetail } from '@/types/api';
import { Alert } from '@/components/ui/alert';

export interface ImportValidationSummaryProps {
  job: ImportJobDetail;
}

/**
 * Counts produced by the validation stage. Invalid and duplicate rows are
 * surfaced explicitly so they can be corrected before importing.
 */
export function ImportValidationSummary({ job }: ImportValidationSummaryProps) {
  const attention = job.invalidRows + job.duplicateRows;
  const tiles = [
    { label: 'Rows in file', value: job.totalRows, tone: 'text-ink' },
    { label: 'Ready to import', value: job.validRows, tone: 'text-success' },
    { label: 'Need attention', value: attention, tone: attention > 0 ? 'text-warning' : 'text-ink' },
    { label: 'Invalid', value: job.invalidRows, tone: job.invalidRows > 0 ? 'text-danger' : 'text-ink' },
    { label: 'Duplicates', value: job.duplicateRows, tone: job.duplicateRows > 0 ? 'text-discrepancy' : 'text-ink' },
  ];

  return (
    <div className="space-y-3">
      {job.summary?.fileErrors?.length ? (
        <Alert tone="danger" title="The file could not be validated">
          <ul className="list-disc space-y-1 pl-4">
            {job.summary.fileErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-md border border-border bg-surface p-3">
            <p className="text-xs font-medium uppercase text-slate">{tile.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${tile.tone}`}>{tile.value}</p>
          </div>
        ))}
      </div>

      {attention > 0 ? (
        <Alert tone="warning" title="Some rows will not be imported">
          {job.invalidRows} invalid and {job.duplicateRows} duplicate row(s) are excluded. Correct
          them using the error report, then upload the corrected file. Valid rows can still be
          imported now.
        </Alert>
      ) : (
        <Alert tone="success" title="Every row passed validation">
          All {job.validRows} row(s) can be imported.
        </Alert>
      )}
    </div>
  );
}
