'use client';

import { useState } from 'react';
import { PackageOpen, PenLine, Sparkles, Upload } from 'lucide-react';
import { AuthErrorMessage } from '@/components/auth/auth-message';
import { AuthInfoMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { cn } from '@/lib/utils';
import type { StockStartOption } from '@/types/auth';

interface OptionDefinition {
  value: StockStartOption;
  title: string;
  body: string;
  icon: typeof Upload;
}

const OPTIONS: OptionDefinition[] = [
  {
    value: 'IMPORT',
    title: 'Import a CSV',
    body: 'Upload a spreadsheet of products and batches, review the validation report, then confirm.',
    icon: Upload,
  },
  {
    value: 'MANUAL',
    title: 'Add products manually',
    body: 'Start with a few products and record quantities as they arrive.',
    icon: PenLine,
  },
  {
    value: 'SAMPLE',
    title: 'Explore sample data',
    body: 'Adds three clearly labelled sample products. No quantities are invented.',
    icon: Sparkles,
  },
  {
    value: 'EMPTY',
    title: 'Start empty',
    body: 'Go straight to the dashboard and add stock whenever you are ready.',
    icon: PackageOpen,
  },
];

export interface StockStartStepProps {
  inventoryNotice: string;
  isSaving: boolean;
  formError: string | null;
  onFinish: (choice: StockStartOption) => void;
  onSkip: () => void;
}

export function StockStartStep({
  inventoryNotice,
  isSaving,
  formError,
  onFinish,
  onSkip,
}: StockStartStepProps) {
  const [choice, setChoice] = useState<StockStartOption | ''>('');

  const primaryLabel =
    choice === 'IMPORT'
      ? 'Import products'
      : choice === 'MANUAL'
        ? 'Add products'
        : choice === 'SAMPLE'
          ? 'Add sample products'
          : 'Finish setup';

  return (
    <div>
      <OnboardingStep
        step={4}
        totalSteps={4}
        title="Add stock"
        description="Choose how you want to start. This step is optional, and nothing here changes a physical count."
        footer={
          <>
            <button
              type="button"
              onClick={onSkip}
              disabled={isSaving}
              className="text-sm font-medium text-slate underline-offset-4 hover:text-ink hover:underline disabled:opacity-50"
            >
              Skip for now
            </button>
            <AuthSubmitButton
              type="button"
              onClick={() => choice && onFinish(choice)}
              disabled={!choice || isSaving}
              isLoading={isSaving}
              loadingLabel="Finishing setup…"
              className="sm:ml-auto sm:w-auto sm:min-w-[220px]"
            >
              {primaryLabel}
            </AuthSubmitButton>
          </>
        }
      >
        <fieldset className="space-y-3">
          <legend className="sr-only">How do you want to add stock?</legend>
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = choice === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors',
                  'focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-1',
                  selected ? 'border-primary-600 bg-primary-50' : 'border-border bg-surface hover:bg-slate-50',
                )}
              >
                <input
                  type="radio"
                  name="stock-start"
                  value={option.value}
                  checked={selected}
                  onChange={() => setChoice(option.value)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
                    selected ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{option.title}</span>
                  <span className="mt-0.5 block text-sm leading-6 text-slate">{option.body}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <AuthInfoMessage>{inventoryNotice}</AuthInfoMessage>
        <AuthErrorMessage>{formError}</AuthErrorMessage>
      </OnboardingStep>
    </div>
  );
}
