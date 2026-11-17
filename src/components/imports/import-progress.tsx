'use client';

import { Alert } from '@/components/ui/alert';
import { LoadingGif } from '@/components/ui/loading';

export interface ImportProgressProps {
  label: string;
  description?: string;
}

/**
 * Inline progress state for long running import steps (validation and
 * confirmation). Uses aria-live so screen readers announce the change.
 */
export function ImportProgress({ label, description }: ImportProgressProps) {
  return (
    <Alert tone="info" title={label}>
      <div className="flex items-center gap-2" aria-live="polite" role="status">
        <LoadingGif className="h-4 w-4" />
        <span>{description ?? 'Please keep this page open while the server processes the file.'}</span>
      </div>
    </Alert>
  );
}
