import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { PageLoader } from '@/components/ui/loading';
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
        <Suspense
          fallback={<PageLoader className="min-h-[18rem] py-0" label="Loading verification…" />}
        >
          <VerifyContactForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
