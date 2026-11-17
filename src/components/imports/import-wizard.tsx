'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardList, UploadCloud } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { ImportJobDetail, ImportType, ImportTypeSchema } from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineLoader, SectionLoader } from '@/components/ui/loading';
import { ColumnMappingTable } from './column-mapping-table';
import { DownloadTemplateButton } from './download-template-button';
import { FileUpload, UploadedFile } from './file-upload';
import { ImportErrorReport } from './import-error-report';
import { ImportPreviewTable } from './import-preview-table';
import { ImportProgress } from './import-progress';
import { ImportResultSummary } from './import-result-summary';
import { ImportValidationSummary } from './import-validation-summary';

const IMPORT_OPTIONS: { type: ImportType; title: string; description: string }[] = [
  {
    type: 'PRODUCTS',
    title: 'Products',
    description: 'Create catalogue products with units, barcodes and reorder thresholds.',
  },
  {
    type: 'BATCHES',
    title: 'Batches',
    description: 'Add batches with expiry dates, quantities and prices to existing products.',
  },
  {
    type: 'INITIAL_STOCK',
    title: 'Initial stock',
    description: 'Load opening quantities for existing products during onboarding.',
  },
];

export interface ImportWizardProps {
  initialType?: ImportType;
}

/**
 * Shared bulk import workflow: choose a type, download the template, upload a
 * CSV, review validation and column mapping, then confirm. Invalid and
 * duplicate rows are never imported silently and are always reported.
 */
export function ImportWizard({ initialType = 'PRODUCTS' }: ImportWizardProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ImportType>(initialType);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [job, setJob] = useState<ImportJobDetail | null>(null);
  const [result, setResult] = useState<ImportJobDetail | null>(null);
  const [mappingDraft, setMappingDraft] = useState<Record<string, string | null>>({});

  const schema = useQuery<ImportTypeSchema>({
    queryKey: ['pharmacy', 'imports', 'schema', type],
    // The step prints its own failure under the template details.
    meta: { silent: true },
    queryFn: () => apiFetch<ImportTypeSchema>(`/pharmacy/imports/schema/${type}`),
  });

  useEffect(() => {
    if (job?.summary?.mapping) {
      setMappingDraft({ ...job.summary.mapping });
    }
  }, [job]);

  const resetReview = () => {
    setJob(null);
    setResult(null);
    setMappingDraft({});
  };

  const selectType = (next: ImportType) => {
    if (next === type) return;
    setType(next);
    setFile(null);
    resetReview();
  };

  const validate = useMutation({
    // The wizard keeps its own result panels; the popup carries the headline for
    // a file the server could not read.
    meta: { errorMessage: 'We could not read that file. Check the columns and try again.' },
    mutationFn: (input: { file: UploadedFile; mapping?: Record<string, string> }) =>
      apiFetch<ImportJobDetail>('/pharmacy/imports', {
        method: 'POST',
        body: JSON.stringify({
          type,
          filename: input.file.name,
          content: input.file.content,
          encoding: input.file.encoding,
          ...(input.mapping && Object.keys(input.mapping).length > 0
            ? { mapping: input.mapping }
            : {}),
        }),
      }),
    onSuccess: (validated) => {
      setJob(validated);
      setResult(null);
    },
  });

  const confirm = useMutation({
    meta: {
      successMessage: 'Import completed successfully.',
      errorMessage: 'The import was not completed. Please try again.',
    },
    mutationFn: (jobId: string) =>
      apiFetch<ImportJobDetail>(`/pharmacy/imports/${jobId}/confirm`, { method: 'POST' }),
    onSuccess: (completed) => {
      setResult(completed);
      setJob(null);
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    },
  });

  const handleFile = (uploaded: UploadedFile) => {
    setFile(uploaded);
    resetReview();
    validate.mutate({ file: uploaded });
  };

  const mappingOverrides = Object.fromEntries(
    Object.entries(mappingDraft).filter(([, header]) => Boolean(header)) as [string, string][],
  );

  const startAgain = () => {
    setFile(null);
    resetReview();
  };

  const busy = validate.isPending || confirm.isPending;

  return (
    <div className="space-y-6">
      {result ? (
        <Card className="p-6">
          <ImportResultSummary job={result} onStartAgain={startAgain} />
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-ink">1. Choose what to import</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {IMPORT_OPTIONS.map((option) => (
                <label
                  key={option.type}
                  className={`cursor-pointer rounded-md border p-3 text-sm transition-colors ${
                    type === option.type
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-border bg-surface hover:bg-background'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="import-type"
                      value={option.type}
                      checked={type === option.type}
                      onChange={() => selectType(option.type)}
                    />
                    <span className="font-medium text-ink">{option.title}</span>
                  </span>
                  <span className="mt-1 block text-xs text-slate">{option.description}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <ClipboardList className="h-5 w-5 text-info" aria-hidden="true" />
              2. Download and prepare the template
            </h2>

            {schema.isLoading ? <SectionLoader label="Loading template details…" className="py-6" /> : null}

            {schema.error ? (
              <Alert tone="danger" className="mt-4" title="Unable to load the template details">
                {schema.error instanceof Error ? schema.error.message : 'Please try again.'}
              </Alert>
            ) : null}

            {schema.data ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate">{schema.data.summary}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <DownloadTemplateButton type={type} />
                  <DownloadTemplateButton type={type} format="csv" variant="ghost" />
                  <Badge status="neutral">.xlsx or .csv</Badge>
                  <Badge status="neutral">Up to {schema.data.maxRows} rows</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-slate">
                        <th scope="col" className="py-2 pr-3">Column</th>
                        <th scope="col" className="py-2 pr-3">Required</th>
                        <th scope="col" className="py-2 pr-3">Notes</th>
                        <th scope="col" className="py-2">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.data.columns.map((column) => (
                        <tr key={column.key} className="border-b border-border last:border-0">
                          <td className="py-2 pr-3 font-medium text-ink">{column.header}</td>
                          <td className="py-2 pr-3">
                            <Badge status={column.required ? 'warning' : 'neutral'}>
                              {column.required ? 'Required' : 'Optional'}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-xs text-slate">{column.description}</td>
                          <td className="py-2 text-xs text-slate">{column.example}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="list-disc space-y-1 pl-5 text-xs text-slate">
                  {schema.data.instructions.map((instruction) => (
                    <li key={instruction}>{instruction}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
              <UploadCloud className="h-5 w-5 text-info" aria-hidden="true" />
              3. Upload the completed file
            </h2>
            <p className="mt-1 text-sm text-slate">
              The file is validated on the server immediately after upload. Nothing is imported until
              you confirm.
            </p>
            <div className="mt-3">
              <FileUpload key={type} onFile={handleFile} disabled={busy} />
            </div>
            {file ? (
              <p className="mt-2 text-xs text-slate">Selected file: {file.name}</p>
            ) : null}
            {validate.isPending ? (
              <div className="mt-3">
                <ImportProgress
                  label="Validating rows"
                  description="Checking required fields, dates, quantities and duplicates."
                />
              </div>
            ) : null}
          </Card>
        </>
      )}

      {job && !result ? (
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
            4. Review before importing
          </h2>
          <p className="mt-1 text-sm text-slate">
            {job.filename} · validated {new Date(job.createdAt).toLocaleString()}
          </p>

          <div className="mt-4">
            <ImportValidationSummary job={job} />
          </div>

          {job.invalidRows + job.duplicateRows + job.failedRows > 0 ? (
            <div className="mt-3">
              <ImportErrorReport jobId={job.id} />
            </div>
          ) : null}

          {schema.data && job.summary?.headers?.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-ink">Column mapping</h3>
              <p className="mt-1 text-xs text-slate">
                Confirm that each template column points at the right header. Validate again after
                changing a mapping.
              </p>
              <div className="mt-3">
                <ColumnMappingTable
                  columns={schema.data.columns}
                  headers={job.summary.headers}
                  mapping={mappingDraft}
                  disabled={busy}
                  onChange={(key, header) =>
                    setMappingDraft((current) => ({ ...current, [key]: header }))
                  }
                />
              </div>
              <Button
                className="mt-3"
                variant="outline"
                size="sm"
                disabled={busy || !file}
                onClick={() => file && validate.mutate({ file, mapping: mappingOverrides })}
              >
                Validate again with this mapping
              </Button>
            </div>
          ) : null}

          {schema.data && job.rows.length > 0 ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-ink">Row preview</h3>
              <div className="mt-2">
                <ImportPreviewTable columns={schema.data.columns} rows={job.rows} />
              </div>
            </div>
          ) : null}

          {confirm.isPending ? (
            <div className="mt-3">
              <ImportProgress
                label="Importing valid rows"
                description="Each row is written with an opening stock movement. Do not close this page."
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button
              onClick={() => confirm.mutate(job.id)}
              disabled={busy || job.validRows === 0 || job.status !== 'VALIDATED'}
            >
              {confirm.isPending ? <InlineLoader label="Importing…" /> : `Import ${job.validRows} valid row(s)`}
            </Button>
            <Button variant="outline" onClick={startAgain} disabled={busy}>
              Upload a different file
            </Button>
            {job.validRows === 0 ? (
              <span className="text-xs text-slate">
                There are no valid rows yet. Correct the file using the error report, then upload it
                again.
              </span>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
