'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { AuthErrorMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/services/api';
import { onboardingApi } from '@/services/auth';
import type { OnboardingOverview, OnboardingStepState, StockStartOption } from '@/types/auth';
import { PharmacyProfileStep } from './pharmacy-profile-step';
import { StaffInvitePanel } from './staff-invite-panel';
import { StockSettingsStep } from './stock-settings-step';
import { StockStartStep } from './stock-start-step';

const TOTAL_STEPS = 4;

interface Destination {
  path: string;
  label: string;
}

function completedSteps(): OnboardingStepState[] {
  return [
    { step: 1, key: 'pharmacy-profile', title: 'Pharmacy profile', description: '', optional: false, completed: true },
    { step: 2, key: 'stock-settings', title: 'Stock settings', description: '', optional: false, completed: true },
    { step: 3, key: 'invite-staff', title: 'Invite staff', description: '', optional: true, completed: true },
    { step: 4, key: 'add-stock', title: 'Add stock', description: '', optional: true, completed: true },
  ];
}

/**
 * The four-step setup wizard. Every step is saved to the API before the wizard
 * moves on, so closing the tab loses nothing and the first unfinished step is
 * where the owner is put back.
 */
export function PharmacySetupWizard() {
  const { profile, role, refreshProfile } = useAuth();

  const [overview, setOverview] = useState<OnboardingOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [done, setDone] = useState<Destination | null>(null);

  useEffect(() => {
    let cancelled = false;

    onboardingApi
      .get()
      .then((result) => {
        if (cancelled) return;
        setOverview(result);
        if (result.progress.status === 'COMPLETED') {
          setDone({ path: '/dashboard', label: 'Go to dashboard' });
        } else {
          setStep(result.progress.firstIncompleteStep ?? TOTAL_STEPS);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'We could not load your setup progress. Check your connection and try again.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const workspaceName =
    overview?.organization.name ?? profile?.organisation.name ?? 'Your pharmacy';

  const applySaved = useCallback((next: OnboardingOverview, nextStep: number) => {
    setOverview(next);
    setStep(nextStep);
  }, []);

  const advanceFromStaff = async (destination: number) => {
    setIsFinishing(true);
    setFinishError(null);
    try {
      const next = await onboardingApi.saveStaffStep();
      applySaved(next, destination);
    } catch (error) {
      setFinishError(
        error instanceof ApiError
          ? error.message
          : 'We could not save this step. Check your connection and try again.',
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const finish = async (choice: StockStartOption) => {
    setIsFinishing(true);
    setFinishError(null);
    try {
      await onboardingApi.saveStockStep(choice);
      await onboardingApi.complete();
      await refreshProfile();
      setDone(
        choice === 'IMPORT'
          ? { path: '/products/pharmacy/import', label: 'Import products' }
          : choice === 'MANUAL'
            ? { path: '/products/pharmacy', label: 'Add products' }
            : { path: '/dashboard', label: 'Go to dashboard' },
      );
    } catch (error) {
      setFinishError(
        error instanceof ApiError
          ? error.message
          : 'We could not finish setup. Check your connection and try again.',
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const skipStockStep = async () => {
    setIsFinishing(true);
    setFinishError(null);
    try {
      await onboardingApi.complete();
      await refreshProfile();
      setDone({ path: '/dashboard', label: 'Go to dashboard' });
    } catch (error) {
      setFinishError(
        error instanceof ApiError
          ? error.message
          : 'We could not finish setup. Check your connection and try again.',
      );
    } finally {
      setIsFinishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-72 w-full animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  if (loadError || !overview) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <AuthErrorMessage>{loadError ?? 'We could not load your setup progress.'}</AuthErrorMessage>
        <Link
          href="/sign-in"
          className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-white px-6 text-sm font-medium text-ink hover:bg-slate-50"
        >
          Sign in again
        </Link>
      </div>
    );
  }

  if (role && role !== 'OWNER') {
    return (
      <OnboardingLayout
        workspaceName={workspaceName}
        steps={overview.progress.steps}
        currentStep={overview.progress.currentStep}
      >
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Setup is managed by the Owner</h2>
          <p className="text-sm leading-6 text-slate">
            Your role does not allow changing pharmacy settings. Ask the workspace Owner to finish
            setup.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-white hover:bg-primary-700"
          >
            Go to dashboard
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  if (done) {
    return (
      <OnboardingLayout workspaceName={workspaceName} steps={completedSteps()} currentStep={TOTAL_STEPS}>
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold text-ink">Your pharmacy is set up.</h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-slate">
            You can change the profile, stock settings and team at any time. Optional tasks you
            skipped stay on your dashboard checklist.
          </p>
          <Link
            href={done.path}
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            {done.label}
          </Link>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      workspaceName={workspaceName}
      steps={overview.progress.steps}
      currentStep={step}
    >
      {step === 1 ? (
        <PharmacyProfileStep
          overview={overview}
          onSaved={(next) => applySaved(next, 2)}
        />
      ) : null}

      {step === 2 ? (
        <StockSettingsStep
          overview={overview}
          onSaved={(next) => applySaved(next, 3)}
        />
      ) : null}

      {step === 3 ? (
        <OnboardingStep
          step={3}
          totalSteps={TOTAL_STEPS}
          title="Invite staff"
          description="Add the people who work in this pharmacy. Everyone you invite joins this workspace only, with the role you choose."
          footer={
            <>
              <button
                type="button"
                onClick={() => void advanceFromStaff(4)}
                disabled={isFinishing}
                className="text-sm font-medium text-slate underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
              >
                Skip for now
              </button>
              <AuthSubmitButton
                type="button"
                onClick={() => void advanceFromStaff(4)}
                isLoading={isFinishing}
                loadingLabel="Saving…"
                className="sm:ml-auto sm:w-auto sm:min-w-[160px]"
              >
                Continue
              </AuthSubmitButton>
            </>
          }
        >
          <StaffInvitePanel />
          <AuthErrorMessage>{finishError}</AuthErrorMessage>
        </OnboardingStep>
      ) : null}

      {step === 4 ? (
        <StockStartStep
          inventoryNotice={overview.inventoryNotice}
          isSaving={isFinishing}
          formError={finishError}
          onFinish={(choice) => void finish(choice)}
          onSkip={() => void skipStockStep()}
        />
      ) : null}
    </OnboardingLayout>
  );
}
