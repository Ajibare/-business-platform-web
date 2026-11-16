'use client';

import { ReactNode } from 'react';
import { PackageSearch } from 'lucide-react';
import { OnboardingProgress } from './onboarding-progress';
import type { OnboardingStepState } from '@/types/auth';

export interface OnboardingLayoutProps {
  workspaceName: string;
  steps: OnboardingStepState[];
  currentStep: number;
  children: ReactNode;
}

/**
 * Setup shell. Deliberately narrower than the app shell: no navigation, so the
 * only ways out are finishing the step or signing out. It also never renders
 * stock data, so nothing leaks before onboarding is complete.
 */
export function OnboardingLayout({
  workspaceName,
  steps,
  currentStep,
  children,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-600 text-white">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{workspaceName}</p>
              <p className="text-xs text-slate">Pharmacy setup</p>
            </div>
          </div>
          {/* No navigation here on purpose: setup is the only task until the
              required steps are saved, and progress is kept server-side, so a
              closed tab resumes on the same step. */}
          <p className="hidden text-xs text-slate sm:block">Progress is saved as you go</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <OnboardingProgress steps={steps} currentStep={currentStep} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-6 shadow-card sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
