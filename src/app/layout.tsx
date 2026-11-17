import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/toast';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Business Platform',
    template: '%s | Business Platform',
  },
  description: 'Multi-product SaaS platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Browser extensions (ColorZilla, Grammarly, password managers) inject attributes
  // onto <html>/<body> before React hydrates. Those attributes are not in the
  // server HTML, so React reports a mismatch it cannot patch. This silences only
  // that one warning, one level deep; it does not hide mismatches inside the tree.
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryProvider>
          {children}
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
