'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage, AuthSuccessMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { ForgotPasswordValues, forgotPasswordSchema } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { authApi } from '@/services/auth';

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: '' },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setFormError(null);
    try {
      const result = await authApi.forgotPassword(values.identifier);
      setSentMessage(result.message);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not send reset instructions. Check your connection and try again.',
      );
    }
  };

  if (sentMessage) {
    return (
      <div className="space-y-5">
        <AuthSuccessMessage>{sentMessage}</AuthSuccessMessage>
        <p className="text-sm leading-6 text-slate">
          The link expires in 30 minutes and can only be used once. Nothing changes until you
          choose a new password.
        </p>
        <Link
          href="/sign-in"
          className="inline-flex h-12 w-full items-center justify-center rounded-md border border-border bg-white text-sm font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <AuthInput
        label="Email or phone"
        type="text"
        autoComplete="username"
        autoFocus
        placeholder="you@pharmacy.com or 0803 123 4567"
        hint="Use the email address or phone number on your account."
        error={errors.identifier?.message}
        {...register('identifier')}
      />

      <AuthErrorMessage>{formError}</AuthErrorMessage>

      <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Sending…">
        Send reset instructions
      </AuthSubmitButton>

      <p className="text-center text-sm text-slate">
        <Link
          href="/sign-in"
          className="font-medium text-primary-700 underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
