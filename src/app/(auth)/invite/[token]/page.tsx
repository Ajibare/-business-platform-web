import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { InvitationAcceptance } from '@/features/auth/invitation-acceptance';

export const metadata: Metadata = {
  title: 'Workspace invitation',
  description: 'Accept your invitation to a Pharmacy Stock Intelligence workspace.',
  // An invitation link is personal; keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <AuthLayout>
      <AuthCard
        title="Join this workspace"
        description="Your role is set by the invitation. Accepting gives you access to this pharmacy only."
      >
        <InvitationAcceptance token={token} />
      </AuthCard>
    </AuthLayout>
  );
}
