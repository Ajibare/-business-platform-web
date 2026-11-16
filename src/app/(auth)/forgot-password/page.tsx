import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Reset your password',
  description: 'Request password reset instructions for your Pharmacy Stock Intelligence account.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Reset your password"
        description="Enter the email address or phone number on your account. If it matches an account, we will send reset instructions."
      >
        <ForgotPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
