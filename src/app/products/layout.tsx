import { ReactNode } from 'react';
import { AppShell } from '@/components/layouts/app-shell';
import { AuthGuard } from '@/components/guards/auth-guard';

/**
 * Every product screen needs the same signed-in dashboard chrome. These routes
 * sit at `/products`, not inside `(platform)`, so this layout has to render the
 * shared shell itself: without it the sidebar and header disappeared on every
 * pharmacy page. The shell is rendered once here rather than inside each page.
 */
export default function ProductsLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
