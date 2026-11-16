'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingStepState } from '@/types/auth';

export interface OnboardingProgressProps {
  steps: OnboardingStepState[];
  currentStep: number;
}

/**
 * Numbered progress rail. Completed steps show a tick, the active step is
 * highlighted and marked `aria-current`, and optional steps are labelled as
 * such so nobody thinks they are blocking completion.
 */
export function OnboardingProgress({ steps, currentStep }: OnboardingProgressProps) {
  const total = steps.length;
  const position = steps.findIndex((step) => step.step === currentStep);
  const current = position >= 0 ? position + 1 : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate">
          Step {current} of {total}
        </p>
        <p className="text-xs text-slate">
          {steps.filter((step) => step.completed).length} of {total} done
        </p>
      </div>

      <ol className="flex gap-2" aria-label="Setup progress">
        {steps.map((step) => {
          const isActive = step.step === currentStep;
          return (
            <li key={step.step} className="flex-1">
              <div
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2 py-2 transition-colors',
                  step.completed
                    ? 'border-success/30 bg-success-soft'
                    : isActive
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-border bg-surface',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    step.completed
                      ? 'bg-success text-white'
                      : isActive
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200 text-slate-700',
                  )}
                >
                  {step.completed ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    step.step
                  )}
                </span>
                <span className="hidden min-w-0 truncate text-xs font-medium text-ink sm:block">
                  {step.title}
                  {step.optional ? <span className="text-slate"> · optional</span> : null}
                </span>
                <span className="sr-only">
                  {step.title}
                  {step.completed ? ' (completed)' : isActive ? ' (current step)' : ''}
                  {step.optional ? ' (optional)' : ''}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
