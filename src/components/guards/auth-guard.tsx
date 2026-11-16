'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
  children: ReactNode;
  /**
   * The platform shell requires a completed setup, so an Owner who has not
   * finished the wizard is sent back to it instead of seeing an empty
   * dashboard. The onboarding layout passes `false`.
   */
  requireOnboardingComplete?: boolean;
}

export function AuthGuard({ children, requireOnboardingComplete = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, profile, role, isLoading } = useAuth();
  // Only the Owner can run the setup wizard; invited staff land on the dashboard.
  const needsSetup = Boolean(requireOnboardingComplete && profile?.onboarding.requiresSetup && role === 'OWNER');

  useEffect(() => {
    if (isLoading) return;

    if (!accessToken) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/sign-in${next}`);
      return;
    }

    if (needsSetup) {
      router.replace('/onboarding/pharmacy-setup');
    }
  }, [isLoading, accessToken, needsSetup, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  if (needsSetup) {
    return null;
  }

  return <>{children}</>;
}
