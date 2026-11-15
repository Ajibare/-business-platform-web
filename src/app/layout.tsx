import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers/query-provider';
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
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
