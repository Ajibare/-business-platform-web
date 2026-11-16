'use client';

import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

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
        <Loader2 className="h-4 w-4 animate-spin text-info" aria-hidden="true" />
        <span>{description ?? 'Please keep this page open while the server processes the file.'}</span>
      </div>
    </Alert>
  );
}
