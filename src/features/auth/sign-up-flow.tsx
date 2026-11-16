'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage, AuthSuccessMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { PasswordInput } from '@/components/auth/password-input';
import { PasswordStrengthIndicator } from '@/components/auth/password-strength-indicator';
import { VerificationCodeInput } from '@/components/auth/verification-code-input';
import { useAuth } from '@/hooks/use-auth';
import { RegisterValues, registerSchema } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { authApi } from '@/services/auth';
import type { RegistrationChallenge } from '@/types/auth';

/** Wording fixed by the product brief; it explains what the account becomes. */
const OWNER_EXPLANATION =
  'You will become the Owner of your pharmacy workspace. Pharmacy Stock Intelligence helps you manage inventory and stock risks. It does not store patient information.';

type Step = 'details' | 'verify';

export function SignUpFlow() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<Step>('details');
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      termsAccepted: false,
    },
  });

  const password = watch('password');
  const email = watch('email');
  const name = watch('name');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const startVerification = (next: RegistrationChallenge) => {
    setChallenge(next);
    setStep('verify');
    setCode('');
    setCodeError(null);
    setFormError(null);
    setNotice(null);
    setResendIn(next.resendAvailableInSeconds);
  };

  const onSubmitDetails = async (values: RegisterValues) => {
    setFormError(null);
    try {
      const result = await authApi.register({
        name: values.name,
        email: values.email,
        phone: values.phone?.trim() ? values.phone : undefined,
        password: values.password,
        confirmPassword: values.confirmPassword,
        termsAccepted: values.termsAccepted,
      });
      setSubmittedEmail(values.email);
      startVerification(result);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('We could not reach the server. Check your connection and try again.');
        return;
      }

      if (error.code === 'VERIFICATION_JUST_SENT' && error.retryAfterSeconds) {
        // The same form was submitted twice; the first code is still valid.
        setSubmittedEmail(values.email);
        setChallenge({
          email: values.email,
          phone: null,
          verificationRequired: true,
          expiresInMinutes: 15,
          resendAvailableInSeconds: error.retryAfterSeconds,
          remainingResends: 0,
        });
        setStep('verify');
        setResendIn(error.retryAfterSeconds);
        setNotice(error.message);
        return;
      }

      if (error.field === 'email' || error.field === 'phone' || error.field === 'password') {
        setError(error.field, { message: error.message });
        return;
      }
      if (error.code === 'EMAIL_IN_USE') {
        setError('email', { message: error.message });
        return;
      }
      if (error.code === 'PHONE_IN_USE') {
        setError('phone', { message: error.message });
        return;
      }
      setFormError(error.message);
    }
  };

  const verify = async (submittedCode: string) => {
    if (isVerifying) return;
    const trimmed = submittedCode.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setCodeError('Enter the six-digit code from your email.');
      return;
    }

    setIsVerifying(true);
    setCodeError(null);
    setFormError(null);
    try {
      const result = await authApi.verifyRegistration({ email: submittedEmail, code: trimmed });
      signIn(result);
      router.replace(result.profile.nextPath);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setCodeError('We could not reach the server. Check your connection and try again.');
        return;
      }
      if (error.code === 'EMAIL_IN_USE' || error.code === 'PHONE_IN_USE') {
        // The contact was taken between step one and verification.
        setStep('details');
        setFormError(error.message);
        return;
      }
      const remaining = error.detailNumber('attemptsRemaining');
      setCodeError(
        remaining !== undefined
          ? `${error.message} ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
          : error.message,
      );
      setCode(trimmed);
      if (
        error.code === 'TOO_MANY_ATTEMPTS' ||
        error.code === 'CODE_EXPIRED' ||
        error.code === 'REGISTRATION_NOT_FOUND'
      ) {
        setResendIn(0);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (isResending || resendIn > 0) return;
    setIsResending(true);
    setFormError(null);
    setNotice(null);
    try {
      const result = await authApi.resendVerification(submittedEmail);
      setResendIn(result.resendAvailableInSeconds);
      setCode('');
      setCodeError(null);
      setNotice('We sent a new six-digit code. It replaces the previous one.');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.retryAfterSeconds) setResendIn(error.retryAfterSeconds);
        setFormError(error.message);
      } else {
        setFormError('We could not send a new code. Check your connection and try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-border bg-background p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Mail className="h-4 w-4 text-primary-700" aria-hidden="true" />
            Check your email
          </p>
          <p className="mt-1 text-sm leading-6 text-slate">
            We sent a six-digit code to{' '}
            <span className="font-medium text-ink">{challenge?.email ?? submittedEmail}</span>. Enter
            it below to create your workspace.
          </p>
        </div>

        <VerificationCodeInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (codeError) setCodeError(null);
          }}
          onComplete={verify}
          invalid={Boolean(codeError)}
          error={codeError ?? undefined}
          hint={
            challenge
              ? `The code expires in ${challenge.expiresInMinutes} minutes.`
              : undefined
          }
          autoFocus
          disabled={isVerifying}
        />

        {notice ? <AuthSuccessMessage>{notice}</AuthSuccessMessage> : null}
        <AuthErrorMessage>{formError}</AuthErrorMessage>

        <AuthSubmitButton
          type="button"
          onClick={() => verify(code)}
          isLoading={isVerifying}
          loadingLabel="Creating your workspace…"
          disabled={code.length !== 6}
        >
          Verify and create workspace
        </AuthSubmitButton>

        <div className="flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={resend}
            disabled={resendIn > 0 || isResending}
            className="font-medium text-primary-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate disabled:no-underline"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : isResending ? 'Sending…' : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('details');
              setFormError(null);
              setCodeError(null);
              setNotice(null);
            }}
            className="text-sm text-slate underline-offset-4 hover:underline"
          >
            Change email or phone number
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmitDetails)} className="space-y-5" noValidate>
      <AuthInput
        label="Full name"
        autoComplete="name"
        autoFocus
        placeholder="Amina Bello"
        error={errors.name?.message}
        {...register('name')}
      />

      <AuthInput
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@pharmacy.com"
        hint="Your verification code is sent here."
        error={errors.email?.message}
        {...register('email')}
      />

      <AuthInput
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0803 123 4567"
        hint="Optional. Used to sign in; codes are sent by email."
        error={errors.phone?.message}
        {...register('phone')}
      />

      <div className="space-y-2">
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordStrengthIndicator password={password ?? ''} email={email} name={name} />
      </div>

      <PasswordInput
        label="Confirm password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <div className="rounded-md border border-border bg-background p-4">
        <p className="text-sm leading-6 text-slate">{OWNER_EXPLANATION}</p>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1"
            {...register('termsAccepted')}
          />
          <span>
            I agree to the Terms of Service and the Privacy Policy.
          </span>
        </label>
        {errors.termsAccepted ? (
          <p className="text-sm text-danger">{errors.termsAccepted.message}</p>
        ) : null}
      </div>

      <AuthErrorMessage>{formError}</AuthErrorMessage>

      <AuthSubmitButton isLoading={isSubmitting} loadingLabel="Creating account…">
        Create account
      </AuthSubmitButton>

      <p className="text-center text-sm text-slate">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-primary-700 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
