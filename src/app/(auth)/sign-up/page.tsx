import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { SignUpFlow } from '@/features/auth/sign-up-flow';

export const metadata: Metadata = {
  title: 'Create your workspace',
  description: 'Create the Owner account for a new Pharmacy Stock Intelligence workspace.',
};

export default function SignUpPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Create your pharmacy workspace"
        description="Start with your own account. We verify your email, then walk you through setting up the pharmacy."
      >
        <SignUpFlow />
      </AuthCard>
    </AuthLayout>
  );
}
