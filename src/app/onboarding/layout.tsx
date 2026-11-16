import { ReactNode } from 'react';
import { AuthGuard } from '@/components/guards/auth-guard';

/**
 * Setup pages require a session but not a finished workspace: this is where an
 * Owner finishes it.
 */
export default function OnboardingRouteLayout({ children }: { children: ReactNode }) {
  return <AuthGuard requireOnboardingComplete={false}>{children}</AuthGuard>;
}
