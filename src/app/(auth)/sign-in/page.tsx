import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { SignInForm } from '@/features/auth/sign-in-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Pharmacy Stock Intelligence workspace.',
};

export default function SignInPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Sign in"
        description="Use the email address or phone number linked to your pharmacy workspace."
        footer={
          <p>
            Closed the tab while registering?{' '}
            <Link
              href="/verify-contact"
              className="font-medium text-primary-700 underline-offset-4 hover:underline"
            >
              Enter your verification code
            </Link>
            .
          </p>
        }
      >
        <Suspense fallback={<div className="h-72 animate-pulse rounded-md bg-slate-100" />}>
          <SignInForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
