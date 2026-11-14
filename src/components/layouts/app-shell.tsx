'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Expiry monitoring', href: '/products/pharmacy/expiry' },
      { label: 'Low-stock alerts', href: '/products/pharmacy/alerts/low-stock' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', href: '/products/pharmacy' },
      { label: 'Stock batches', href: '/products/pharmacy/batches' },
      { label: 'Stock movements', href: '/products/pharmacy/movements' },
      { label: 'Stock counts', href: '/products/pharmacy/counts' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Reorder recommendations', href: '/products/pharmacy/reorder' },
      { label: 'Reports', href: '/products/pharmacy/reports' },
      { label: 'Suppliers', href: '/products/pharmacy/suppliers' },
      { label: 'Staff management', href: '/platform/staff' },
      { label: 'Settings', href: '/platform/settings' },
      { label: 'Subscription', href: '/platform/subscription' },
      { label: 'Help', href: '/platform/help' },
    ],
  },
];

const mobileNavItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Products', href: '/products/pharmacy' },
  { label: 'Stock batches', href: '/products/pharmacy/batches' },
  { label: 'Expiry monitoring', href: '/products/pharmacy/expiry' },
  { label: 'Low-stock alerts', href: '/products/pharmacy/alerts/low-stock' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <p className="text-sm font-semibold text-ink">Pharmacy workspace</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="px-2 py-1 text-xs font-medium uppercase text-slate">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100',
                    isActive(item.href) ? 'bg-primary-50 text-primary-700' : 'text-ink',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  const mobileContent = (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-surface md:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'text-xs font-medium',
              isActive(item.href) ? 'text-primary-700' : 'text-slate',
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen md:flex">
        <aside className="hidden w-64 flex-col border-r bg-surface md:flex">
          {sidebarContent}
        </aside>
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b bg-surface">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <p className="text-sm font-semibold text-ink">Pharmacy workspace</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Notifications
                </Button>
                <Button variant="outline" size="sm">
                  Account
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
      {mobileContent}
    </div>
  );
}
