'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SIGN_IN } from '@/lib/route-guard';
import { PageLoader } from '@/components/ui/loading';

interface AuthGuardProps {
  children: ReactNode;
  /**
   * The platform shell requires a completed setup, so an Owner who has not
   * finished the wizard is sent back to it instead of seeing an empty
   * dashboard. The onboarding layout passes `false`.
   */
  requireOnboardingComplete?: boolean;
}

/**
 * The authority on access. Middleware only decides whether a browser is *known*
 * to have a session; this decides whether it actually does, and where a
 * signed-in person belongs. Nothing is rendered until that answer is in, so a
 * protected screen never flashes before a redirect.
 */
export function AuthGuard({ children, requireOnboardingComplete = true }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, profile, role, isLoading, signOut } = useAuth();

  // Only the Owner can run the setup wizard; invited staff land on the dashboard.
  const needsSetup = Boolean(requireOnboardingComplete && profile?.onboarding.requiresSetup && role === 'OWNER');
  // A token can outlive the account or its membership. The profile is the only
  // place that says so, and there is no point rendering a shell that every
  // request will refuse.
  const isBlocked = Boolean(
    profile && (profile.user.status === 'DEACTIVATED' || profile.membership.active === false),
  );

  useEffect(() => {
    if (isLoading) return;

    if (isBlocked) {
      void signOut();
      router.replace(SIGN_IN);
      return;
    }

    if (!accessToken) {
      // Keep the query string: a filtered list reopens filtered after sign-in.
      const search = typeof window === 'undefined' ? '' : window.location.search;
      const next = pathname ? `?next=${encodeURIComponent(pathname + search)}` : '';
      router.replace(`${SIGN_IN}${next}`);
      return;
    }

    if (needsSetup) {
      router.replace('/onboarding/pharmacy-setup');
    }
  }, [isLoading, isBlocked, accessToken, needsSetup, pathname, router, signOut]);

  if (isLoading) {
    return <PageLoader className="min-h-screen bg-background" label="Checking your session…" />;
  }

  if (!accessToken || needsSetup || isBlocked) {
    return null;
  }

  return <>{children}</>;
}
