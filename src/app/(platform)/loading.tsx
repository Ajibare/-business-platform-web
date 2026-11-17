import { PageLoader } from '@/components/ui/loading';

/**
 * Route-level fallback for the dashboard and notification screens. It renders
 * inside `(platform)/layout.tsx`, so only the content area is replaced while
 * the shell stays usable.
 */
export default function PlatformLoading() {
  return <PageLoader label="Loading this screen…" />;
}
