import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { ResetPasswordForm } from '@/features/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password for your Pharmacy Stock Intelligence account.',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthLayout>
      <AuthCard
        title="Choose a new password"
        description="Signing in again will end every other session, in case someone else knew your old password."
      >
        <ResetPasswordForm token={token ?? ''} />
      </AuthCard>
    </AuthLayout>
  );
}
