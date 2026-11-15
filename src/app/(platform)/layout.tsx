import { ReactNode } from 'react';
import { AppShell } from '@/components/layouts/app-shell';
import { AuthGuard } from '@/components/guards/auth-guard';

export default function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
