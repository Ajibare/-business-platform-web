'use client';

import { ReactNode } from 'react';

export interface OnboardingStepProps {
  title: string;
  description: string;
  step: number;
  totalSteps: number;
  children: ReactNode;
  /** Actions rendered at the bottom of the step. */
  footer: ReactNode;
}

/**
 * One screen of the wizard: heading, body and a footer that always contains the
 * forward action so the primary button never moves between steps.
 */
export function OnboardingStep({
  title,
  description,
  step,
  totalSteps,
  children,
  footer,
}: OnboardingStepProps) {
  return (
    <section className="space-y-6" aria-labelledby="onboarding-step-title">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Step {step} of {totalSteps}
        </p>
        <h2 id="onboarding-step-title" className="mt-1 text-xl font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate">{description}</p>
      </header>

      <div className="space-y-5">{children}</div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        {footer}
      </div>
    </section>
  );
}
