import { PageLoader } from '@/components/ui/loading';

/**
 * Route-level fallback for every `/products/*` screen. Next.js renders this
 * inside `products/layout.tsx`, so the sidebar and header stay in place while
 * the next screen is prepared and the user never sees a blank page.
 */
export default function ProductsLoading() {
  return <PageLoader label="Loading this screen…" />;
}
