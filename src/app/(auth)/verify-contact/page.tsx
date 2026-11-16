import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { VerifyContactForm } from '@/features/auth/verify-contact-form';

export const metadata: Metadata = {
  title: 'Verify your email',
  description: 'Finish registering a Pharmacy Stock Intelligence workspace with your verification code.',
  robots: { index: false, follow: false },
};

export default function VerifyContactPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Verify your email"
        description="Enter the six-digit code we sent when you registered. The workspace is only created once this address is confirmed."
      >
        <Suspense fallback={<div className="h-72 animate-pulse rounded-md bg-slate-100" />}>
          <VerifyContactForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
