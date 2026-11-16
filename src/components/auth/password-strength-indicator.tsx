'use client';

import { CheckCircle2, CircleAlert } from 'lucide-react';
import { assessPassword } from '@/lib/auth-validation';
import { cn } from '@/lib/utils';

const SEGMENT_TONES = ['bg-danger', 'bg-danger', 'bg-warning', 'bg-info', 'bg-success'];
const TEXT_TONES = ['text-danger', 'text-danger', 'text-warning', 'text-info', 'text-success'];

export interface PasswordStrengthIndicatorProps {
  password: string;
  /** Used to reject a password built from the user's own name or email. */
  email?: string;
  name?: string;
}

/**
 * Guidance while typing, using the same rules the API enforces. It shows the
 * unmet requirement instead of a bare "weak" so the user knows what to change.
 */
export function PasswordStrengthIndicator({
  password,
  email,
  name,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const assessment = assessPassword(password, { email, name });
  const score = assessment.score;

  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate">Password strength</span>
        <span className={cn('text-xs font-medium', TEXT_TONES[score])}>{assessment.label}</span>
      </div>

      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index < score ? SEGMENT_TONES[score] : 'bg-slate-200',
            )}
          />
        ))}
      </div>

      {assessment.issues.length > 0 ? (
        <p className="flex items-start gap-1.5 text-xs text-slate">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
          <span>{assessment.issues[0]}</span>
        </p>
      ) : (
        <p className="flex items-start gap-1.5 text-xs text-success">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{assessment.suggestions[0] ?? 'This password meets the requirements.'}</span>
        </p>
      )}
    </div>
  );
}
