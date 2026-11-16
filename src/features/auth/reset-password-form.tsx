'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { AuthErrorMessage, AuthSuccessMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator';
import { ResetPasswordValues, resetPasswordSchema } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { authApi } from '@/services/auth';

export function ResetPasswordForm({ token }: { token: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async (values: ResetPasswordValues) => {
    setFormError(null);
    try {
      await authApi.resetPassword({
        token,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
        setInvalidToken(true);
        setFormError(error.message);
        return;
      }
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not reach the server. Check your connection and try again.',
      );
    }
  };

  if (!token) {
    return (
      <div className="space-y-5">
        <AuthErrorMessage>
          This password reset link is missing its token. Open the link from the email again, or
          request a new one.
        </AuthErrorMessage>
        <Link
          href="/forgot-password"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <AuthSuccessMessage>
          Your password has been updated. Every other session has been signed out.
        </AuthSuccessMessage>
        <Link
          href="/sign-in"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Continue to sign in
        </Link>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="space-y-5">
        <AuthErrorMessage>{formError}</AuthErrorMessage>
        <Link
          href="/forgot-password"
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-2">
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          autoFocus
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordStrengthIndicator password={password ?? ''} />
      </div>

      <PasswordInput
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <AuthErrorMessage>{formError}</AuthErrorMessage>

      <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Saving…">
        Save new password
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
