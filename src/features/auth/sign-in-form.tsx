'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { PasswordInput } from '@/components/auth/password-input';
import { useAuth } from '@/hooks/use-auth';
import { SignInValues, signInSchema } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { authApi } from '@/services/auth';

/** Only same-origin paths are accepted, so `?next=` cannot become an open redirect. */
function safeNextPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (values: SignInValues) => {
    setFormError(null);
    try {
      const result = await authApi.signIn(values);
      signIn(result);
      router.replace(safeNextPath(searchParams.get('next')) ?? result.profile.nextPath);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('We could not reach the server. Check your connection and try again.');
        return;
      }
      if (error.field === 'identifier' || error.field === 'password') {
        setError(error.field, { message: error.message });
        return;
      }
      // Wrong password, locked account, deactivated account and rate limiting all
      // use the API's own wording so the user gets the real reason, never a hint
      // about which identifier exists.
      setFormError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <AuthInput
        label="Email or phone"
        type="text"
        inputMode="text"
        autoComplete="username"
        autoFocus
        placeholder="you@pharmacy.com or 0803 123 4567"
        error={errors.identifier?.message}
        {...register('identifier')}
      />

      <PasswordInput
        label="Password"
        autoComplete="current-password"
        error={errors.password?.message}
        labelAction={
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary-700 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        }
        {...register('password')}
      />

      <AuthErrorMessage>{formError}</AuthErrorMessage>

      <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Signing in…">
        Sign in
      </AuthSubmitButton>

      <p className="text-center text-sm text-slate">
        New to Pharmacy Stock Intelligence?{' '}
        <Link
          href="/sign-up"
          className="font-medium text-primary-700 underline-offset-4 hover:underline"
        >
          Create a pharmacy workspace
        </Link>
      </p>
    </form>
  );
}
