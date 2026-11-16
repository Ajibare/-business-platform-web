'use client';

import { useState } from 'react';
import { FileWarning } from 'lucide-react';
import { apiFetchFile } from '@/services/api';
import { Button } from '@/components/ui/button';
import { downloadTextFile } from '@/lib/download';

export interface ImportErrorReportProps {
  jobId: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Downloads the CSV error report for an import job. Contains every invalid,
 * duplicate or failed row with the reasons and the original values.
 */
export function ImportErrorReport({
  jobId,
  label = 'Download error report',
  disabled,
}: ImportErrorReportProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setPending(true);
    setError(null);
    try {
      const file = await apiFetchFile(`/pharmacy/imports/${jobId}/errors`);
      downloadTextFile(file.filename, file.content, file.contentType);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to build the error report.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <Button variant="outline" size="sm" onClick={download} disabled={disabled || pending}>
        <FileWarning className="mr-2 h-4 w-4" aria-hidden="true" />
        {pending ? 'Preparing…' : label}
      </Button>
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
