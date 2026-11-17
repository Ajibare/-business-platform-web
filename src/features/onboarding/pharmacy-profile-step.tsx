'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { OnboardingStep } from '@/components/onboarding/onboarding-step';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { PharmacyProfileValues, pharmacyProfileSchema, TIME_ZONES } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { onboardingApi } from '@/services/auth';
import { OUTLET_PROFILES, type OnboardingOverview } from '@/types/auth';

const OUTLET_OPTIONS = OUTLET_PROFILES.map((profile) => ({ value: profile, label: profile }));
const TIME_ZONE_OPTIONS = TIME_ZONES.map((zone) => ({ value: zone, label: zone }));

export function PharmacyProfileStep({
  overview,
  onSaved,
}: {
  overview: OnboardingOverview;
  onSaved: (next: OnboardingOverview) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PharmacyProfileValues>({
    resolver: zodResolver(pharmacyProfileSchema),
    defaultValues: {
      name: overview.organization.name,
      outletProfile: overview.organization.outletProfile ?? '',
      address: overview.organization.address ?? '',
      timezone: overview.organization.timezone || 'Africa/Lagos',
    },
  });

  const onSubmit = async (values: PharmacyProfileValues) => {
    setFormError(null);
    try {
      const next = await onboardingApi.savePharmacyProfile({
        name: values.name,
        outletProfile: values.outletProfile,
        address: values.address?.trim() ? values.address : undefined,
        timezone: values.timezone,
      });
      onSaved(next);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not save these details. Check your connection and try again.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <OnboardingStep
        step={1}
        totalSteps={4}
        title="Pharmacy profile"
        description="This is the name your team sees and the outlet it describes. You can change it later."
        footer={
          <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Saving…">
            Continue
          </AuthSubmitButton>
        }
      >
        <AuthInput
          label="Pharmacy or business name"
          required
          autoFocus
          autoComplete="organization"
          placeholder="Green Cross Pharmacy"
          error={errors.name?.message}
          {...register('name')}
        />

        <Controller
          control={control}
          name="outletProfile"
          render={({ field }) => (
            <SearchableSelect
              label="Outlet profile"
              required
              value={field.value ?? ''}
              onChange={field.onChange}
              options={OUTLET_OPTIONS}
              placeholder="Select the outlet type"
              searchPlaceholder="Search outlet types…"
              emptyMessage="No outlet type matches that search."
              error={errors.outletProfile?.message}
            />
          )}
        />

        <AuthInput
          label="Address"
          autoComplete="street-address"
          placeholder="12 Awolowo Road, Ikoyi, Lagos"
          hint="Optional. Helps your team tell branches apart."
          error={errors.address?.message}
          {...register('address')}
        />

        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <SearchableSelect
              label="Time zone"
              required
              value={field.value ?? ''}
              onChange={field.onChange}
              options={TIME_ZONE_OPTIONS}
              searchPlaceholder="Search time zones…"
              emptyMessage="No time zone matches that search."
              error={errors.timezone?.message}
            />
          )}
        />

        <p className="text-xs text-slate">
          Used for expiry windows and reminders. Nigerian pharmacies usually use Africa/Lagos.
        </p>

        <AuthErrorMessage>{formError}</AuthErrorMessage>
      </OnboardingStep>
    </form>
  );
}
