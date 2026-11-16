'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator';
import { useAuth } from '@/hooks/use-auth';
import { InvitationAcceptValues, invitationAcceptSchema } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { invitationApi } from '@/services/auth';
import { ROLE_LABELS, type InvitationPreview } from '@/types/auth';

interface InvitationAcceptanceProps {
  token: string;
}

export function InvitationAcceptance({ token }: InvitationAcceptanceProps) {
  const router = useRouter();
  const { accessToken, profile, signIn, signOut, applySession } = useAuth();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvitationAcceptValues>({
    resolver: zodResolver(invitationAcceptSchema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  useEffect(() => {
    let cancelled = false;
    invitationApi
      .preview(token)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'We could not check this invitation. Check your connection and try again.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const acceptAsSignedIn = useCallback(async () => {
    setIsAccepting(true);
    setFormError(null);
    try {
      const result = await invitationApi.acceptExisting(token);
      applySession(result);
      router.replace(result.profile.nextPath);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not accept this invitation. Check your connection and try again.',
      );
    } finally {
      setIsAccepting(false);
    }
  }, [token, applySession, router]);

  const acceptAsNewAccount = async (values: InvitationAcceptValues) => {
    setFormError(null);
    try {
      const result = await invitationApi.acceptNewAccount(token, {
        name: values.name,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      signIn(result);
      router.replace(result.profile.nextPath);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'We could not accept this invitation. Check your connection and try again.',
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  if (loadError || !preview) {
    return (
      <div className="space-y-5">
        <AuthErrorMessage>{loadError ?? 'This invitation link is not valid.'}</AuthErrorMessage>
        <Link
          href="/sign-in"
          className="inline-flex h-12 w-full items-center justify-center rounded-md border border-border bg-white text-sm font-medium text-ink transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const workspace = (
    <div className="rounded-md border border-border bg-background p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Building2 className="h-4 w-4 text-primary-700" aria-hidden="true" />
        {preview.organizationName}
      </p>
      <p className="mt-1 text-sm text-slate">
        You have been invited as{' '}
        <span className="font-medium text-ink">{ROLE_LABELS[preview.role]}</span>
        {preview.email ? (
          <>
            {' '}
            using <span className="font-medium text-ink">{preview.email}</span>
          </>
        ) : null}
        .
      </p>
    </div>
  );

  if (accessToken) {
    return (
      <div className="space-y-5">
        {workspace}
        <p className="text-sm leading-6 text-slate">
          You are signed in as{' '}
          <span className="font-medium text-ink">
            {profile?.user.email ?? profile?.user.phone ?? 'this account'}
          </span>
          . Accepting adds this workspace to your account.
        </p>

        <AuthErrorMessage>{formError}</AuthErrorMessage>

        <AuthSubmitButton
          type="button"
          onClick={acceptAsSignedIn}
          isLoading={isAccepting}
          loadingLabel="Accepting…"
        >
          Accept invitation
        </AuthSubmitButton>

        <p className="text-center text-sm text-slate">
          Not you?{' '}
          <button
            type="button"
            onClick={() => void signOut()}
            className="font-medium text-primary-700 underline-offset-4 hover:underline"
          >
            Sign out
          </button>
        </p>
      </div>
    );
  }

  if (preview.hasAccount) {
    return (
      <div className="space-y-5">
        {workspace}
        <p className="text-sm leading-6 text-slate">
          An account already exists for this invitation. Sign in with the invited email address or
          phone number to accept it.
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-primary-600 px-6 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Sign in to accept
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(acceptAsNewAccount)} className="space-y-5" noValidate>
      {workspace}

      <p className="text-sm leading-6 text-slate">
        Create your account to join. Your role is set by the invitation and cannot be changed here.
      </p>

      <AuthInput
        label="Full name"
        autoComplete="name"
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="space-y-2">
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordStrengthIndicator password={password ?? ''} email={preview.email ?? undefined} />
      </div>

      <PasswordInput
        label="Confirm password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <AuthErrorMessage>{formError}</AuthErrorMessage>

      <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Joining…">
        Create account and join
      </AuthSubmitButton>

      <p className="text-center text-sm text-slate">
        Already have an account?{' '}
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="font-medium text-primary-700 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
