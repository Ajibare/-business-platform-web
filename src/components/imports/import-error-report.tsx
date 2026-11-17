'use client';

import { useState } from 'react';
import { FileWarning } from 'lucide-react';
import { apiFetchFile } from '@/services/api';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { userMessageFor } from '@/lib/api-errors';
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

  const download = async () => {
    setPending(true);
    try {
      const file = await apiFetchFile(`/pharmacy/imports/${jobId}/errors`);
      downloadTextFile(file.filename, file.content, file.contentType);
      toast.success(`${file.filename} downloaded.`);
    } catch (cause) {
      toast.error(userMessageFor(cause, 'Unable to build the error report. Please try again.'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={download} disabled={disabled || pending}>
      <FileWarning className="mr-2 h-4 w-4" aria-hidden="true" />
      {pending ? 'Preparing…' : label}
    </Button>
  );
}
