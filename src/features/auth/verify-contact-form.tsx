'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthInput } from '@/components/auth/auth-input';
import { AuthErrorMessage, AuthSuccessMessage } from '@/components/auth/auth-message';
import { AuthSubmitButton } from '@/components/auth/auth-submit-button';
import { VerificationCodeInput } from '@/components/auth/verification-code-input';
import { useAuth } from '@/hooks/use-auth';
import { isValidEmail } from '@/lib/auth-validation';
import { ApiError } from '@/services/api';
import { authApi } from '@/services/auth';

/**
 * Verifies a registration on a page that can be opened on its own.
 *
 * `/sign-up` asks for the code on the same screen that started the registration,
 * which is lost if the tab is closed or the person switches to their mailbox on
 * another device. This page takes the email plus the code and finishes the same
 * call, so registration can be completed from a cold start.
 */
export function VerifyContactForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('email');
    if (fromQuery) setEmail(fromQuery.trim());
  }, [searchParams]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const verify = async (submittedCode: string) => {
    if (isVerifying) return;

    const trimmedEmail = email.trim();
    const trimmedCode = submittedCode.trim();

    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Enter the email address you registered with.');
      return;
    }
    if (!/^\d{6}$/.test(trimmedCode)) {
      setCodeError('Enter the six-digit code from your email.');
      return;
    }

    setIsVerifying(true);
    setEmailError(null);
    setCodeError(null);
    setFormError(null);
    try {
      const result = await authApi.verifyRegistration({ email: trimmedEmail, code: trimmedCode });
      signIn(result);
      router.replace(result.profile.nextPath);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setCodeError('We could not reach the server. Check your connection and try again.');
        return;
      }
      if (error.code === 'EMAIL_IN_USE' || error.code === 'PHONE_IN_USE') {
        setFormError(error.message);
        return;
      }
      const remaining = error.detailNumber('attemptsRemaining');
      setCodeError(
        remaining !== undefined
          ? `${error.message} ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`
          : error.message,
      );
      setCode(trimmedCode);
      if (
        error.code === 'TOO_MANY_ATTEMPTS' ||
        error.code === 'CODE_EXPIRED' ||
        error.code === 'REGISTRATION_NOT_FOUND'
      ) {
        // Waiting for the cooldown is pointless once the code itself is gone.
        setResendIn(0);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const resend = async () => {
    if (isResending || resendIn > 0) return;

    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Enter the email address you registered with.');
      return;
    }

    setIsResending(true);
    setFormError(null);
    setNotice(null);
    try {
      const result = await authApi.resendVerification(trimmedEmail);
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

  return (
    <div className="space-y-5">
      <AuthInput
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@pharmacy.com"
        hint="The address you started registering with."
        error={emailError ?? undefined}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          if (emailError) setEmailError(null);
        }}
      />

      <VerificationCodeInput
        value={code}
        onChange={(next) => {
          setCode(next);
          if (codeError) setCodeError(null);
        }}
        onComplete={verify}
        invalid={Boolean(codeError)}
        error={codeError ?? undefined}
        hint="The code expires 15 minutes after it was sent."
        disabled={isVerifying}
      />

      {notice ? <AuthSuccessMessage>{notice}</AuthSuccessMessage> : null}
      <AuthErrorMessage>{formError}</AuthErrorMessage>

      <AuthSubmitButton
        type="button"
        onClick={() => verify(code)}
        isLoading={isVerifying}
        loadingLabel="Verifying…"
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
        <Link
          href="/sign-in"
          className="text-sm text-slate underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
