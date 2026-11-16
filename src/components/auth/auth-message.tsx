'use client';

import { ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageProps {
  children?: ReactNode;
  id?: string;
  className?: string;
}

/**
 * Form-level error. `role="alert"` makes a screen reader announce it the moment
 * it appears, which matters because the message usually explains a failed
 * request rather than an invalid field.
 */
export function AuthErrorMessage({ children, id, className }: MessageProps) {
  if (!children) return null;
  return (
    <div
      id={id}
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md border border-danger/25 bg-danger-soft px-3 py-2.5 text-sm text-danger',
        className,
      )}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function AuthSuccessMessage({ children, id, className }: MessageProps) {
  if (!children) return null;
  return (
    <div
      id={id}
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-md border border-success/25 bg-success-soft px-3 py-2.5 text-sm text-success',
        className,
      )}
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/** Neutral explanation, for example the inventory-record notice. */
export function AuthInfoMessage({ children, id, className }: MessageProps) {
  if (!children) return null;
  return (
    <div
      id={id}
      className={cn(
        'flex items-start gap-2 rounded-md border border-info/25 bg-info-soft px-3 py-2.5 text-sm text-info',
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}
