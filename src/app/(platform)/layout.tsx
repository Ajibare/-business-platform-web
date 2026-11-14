import { ReactNode } from 'react';
import { AppShell } from '@/components/layouts/app-shell';

export default function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
