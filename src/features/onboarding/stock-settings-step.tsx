'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import {
  StockSettingsValues,
  parseOptionalMinimum,
  stockSettingsSchema,
} from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { onboardingApi } from '@/services/auth';
import type { OnboardingOverview } from '@/types/auth';

export function StockSettingsStep({
  overview,
  onSaved,
}: {
  overview: OnboardingOverview;
  onSaved: (next: OnboardingOverview) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  // Kept outside the form so blank stays blank: "" means not configured, which
  // is different from a minimum of zero.
  const [minimumLevel, setMinimumLevel] = useState(
    overview.organization.defaultMinStockLevel !== null
      ? String(overview.organization.defaultMinStockLevel)
      : '',
  );
  const [minimumError, setMinimumError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockSettingsValues>({
    resolver: zodResolver(stockSettingsSchema),
    defaultValues: {
      nearExpiryWarningDays: overview.organization.nearExpiryWarningDays,
      defaultUnit: overview.organization.defaultUnit ?? '',
    },
  });

  const onSubmit = async (values: StockSettingsValues) => {
    setFormError(null);
    const parsedMinimum = parseOptionalMinimum(minimumLevel);
    if (parsedMinimum === 'invalid') {
      setMinimumError('Enter a whole number of units, or leave this blank.');
      return;
    }
    setMinimumError(null);

    try {
      const next = await onboardingApi.saveStockSettings({
        nearExpiryWarningDays: values.nearExpiryWarningDays,
        defaultUnit: values.defaultUnit?.trim() ? values.defaultUnit : undefined,
        defaultMinStockLevel: parsedMinimum,
      });
      onSaved(next);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not save these settings. Check your connection and try again.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <OnboardingStep
        step={2}
        totalSteps={4}
        title="Stock settings"
        description="These defaults drive the warnings you will see. They can be changed at any time."
        footer={
          <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Saving…">
            Continue
          </AuthSubmitButton>
        }
      >
        <AuthInput
          label="Near-expiry warning window (days)"
          type="number"
          min={1}
          max={365}
          step={1}
          required
          inputMode="numeric"
          hint="Batches expiring within this many days appear in the expiry monitor. 90 days is a common choice."
          error={errors.nearExpiryWarningDays?.message}
          {...register('nearExpiryWarningDays')}
        />

        <AuthInput
          label="Default unit"
          autoComplete="off"
          placeholder="tablet, capsule, sachet, bottle"
          hint="Used as the starting unit when you add a product."
          error={errors.defaultUnit?.message}
          {...register('defaultUnit')}
        />

        <AuthInput
          label="Default minimum stock level"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={minimumLevel}
          onChange={(event) => {
            setMinimumLevel(event.target.value);
            if (minimumError) setMinimumError(null);
          }}
          hint="Optional. Leave blank if you have not set one — blank is stored as not configured, not as zero."
          error={minimumError ?? undefined}
        />

        <AuthErrorMessage>{formError}</AuthErrorMessage>
      </OnboardingStep>
    </form>
  );
}
