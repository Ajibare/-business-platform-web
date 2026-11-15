'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  ChartNoAxesCombined,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Package,
  Pill,
  Truck,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Expiry monitoring', href: '/products/pharmacy/expiry', icon: CalendarClock },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', href: '/products/pharmacy', icon: Pill },
      { label: 'Stock batches', href: '/products/pharmacy/batches', icon: Package },
      { label: 'Stock movements', href: '/products/pharmacy/movements', icon: ArrowLeftRight },
      { label: 'Stock receipts', href: '/products/pharmacy/receipts', icon: Truck },
      { label: 'Suppliers', href: '/products/pharmacy/suppliers', icon: Building2 },
      { label: 'Stock counts', href: '/products/pharmacy/counts', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Reports', href: '/products/pharmacy/reports', icon: ChartNoAxesCombined },
    ],
  },
];

const mobileNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products/pharmacy', icon: Pill },
  { label: 'Stock batches', href: '/products/pharmacy/batches', icon: Package },
  { label: 'Expiry', href: '/products/pharmacy/expiry', icon: CalendarClock },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

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
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100',
                      isActive(item.href) ? 'bg-primary-50 text-primary-700' : 'text-ink',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );

  const mobileContent = (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-surface md:hidden">
      <div className="flex items-center justify-between px-4 py-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-2 text-xs font-medium',
                isActive(item.href) ? 'text-primary-700' : 'text-slate',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signOut();
                    router.push('/login');
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign out
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
