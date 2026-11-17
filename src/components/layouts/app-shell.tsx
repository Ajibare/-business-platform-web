'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Bell,
  Building2,
  CalendarClock,
  ChartColumn,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Pill,
  Receipt,
  ScanLine,
  ShieldCheck,
  Store,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { BranchSwitcher } from '@/components/branches/branch-switcher';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ExpiryAlertDialog } from '@/features/pharmacy/expiry-alert-dialog';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/types/auth';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** When set, the link only appears for a member holding this permission. */
  permission?: string;
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
      {
        label: 'Expiry monitoring',
        href: '/products/pharmacy/expiry',
        icon: CalendarClock,
        permission: 'expiry:read',
      },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', href: '/products/pharmacy', icon: Pill, permission: 'product:read' },
      { label: 'Add medicines', href: '/products/pharmacy/add', icon: PackagePlus, permission: 'product:manage' },
      { label: 'Record sale', href: '/products/pharmacy/sales', icon: Receipt, permission: 'sale:record' },
      { label: 'Scan product', href: '/products/pharmacy/scan', icon: ScanLine, permission: 'product:read' },
      { label: 'Stock batches', href: '/products/pharmacy/batches', icon: Package, permission: 'inventory:read' },
      { label: 'Stock movements', href: '/products/pharmacy/movements', icon: ArrowLeftRight, permission: 'inventory:read' },
      { label: 'Stock receipts', href: '/products/pharmacy/receipts', icon: Truck, permission: 'inventory:receive' },
      {
        label: 'Stock transfers',
        href: '/products/pharmacy/transfers',
        icon: Store,
        permission: 'transfer:read',
      },
      { label: 'Suppliers', href: '/products/pharmacy/suppliers', icon: Building2, permission: 'supplier:read' },
      { label: 'Stock counts', href: '/products/pharmacy/counts', icon: ClipboardCheck, permission: 'inventory:count' },
      { label: 'Bulk import', href: '/products/pharmacy/import', icon: FileSpreadsheet, permission: 'product:manage' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Reports',
        href: '/products/pharmacy/reports',
        icon: ChartNoAxesCombined,
        permission: 'report:read',
      },
      {
        label: 'Organisation reports',
        href: '/reports/organisation',
        icon: ChartColumn,
        permission: 'report:read',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Branches', href: '/branches', icon: Building2, permission: 'branch:read' },
      { label: 'Staff', href: '/staff', icon: Users, permission: 'staff:read' },
      {
        label: 'Roles & permissions',
        href: '/settings/permissions',
        icon: ShieldCheck,
        permission: 'staff:permissions',
      },
    ],
  },
];

const mobileNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products/pharmacy', icon: Pill, permission: 'product:read' },
  { label: 'Scan', href: '/products/pharmacy/scan', icon: ScanLine, permission: 'product:read' },
  { label: 'Expiry', href: '/products/pharmacy/expiry', icon: CalendarClock, permission: 'expiry:read' },
  { label: 'Alerts', href: '/notifications', icon: Bell },
];

/** Every destination the shell can highlight, used to pick the most specific one. */
const NAV_HREFS = navGroups.flatMap((group) => group.items.map((item) => item.href));

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, profile } = useAuth();
  const { can } = usePermissions();
  const [menuOpen, setMenuOpen] = useState(false);

  // A screen the member cannot use is not advertised. The API still refuses the
  // call, so hiding the link never becomes the access control itself.
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  const visibleMobileNav = mobileNavItems.filter(
    (item) => !item.permission || can(item.permission),
  );

  // The drawer only exists for the current page: following a link closes it.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const workspaceName = profile?.organisation.name ?? 'Pharmacy workspace';
  const roleLabel = profile ? ROLE_LABELS[profile.membership.role] : null;

  /**
   * Only the most specific destination is highlighted. `/products/pharmacy` is a
   * prefix of every inventory screen, so a plain `startsWith` lit it up together
   * with `Record sale` while the sales page was open.
   */
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (!pathname.startsWith(`${href}/`)) return false;
    return !NAV_HREFS.some(
      (other) =>
        other.length > href.length &&
        other.startsWith(`${href}/`) &&
        (pathname === other || pathname.startsWith(`${other}/`)),
    );
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/sign-in');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <p className="truncate text-sm font-semibold text-ink" title={workspaceName}>
          {workspaceName}
        </p>
        <p className="text-xs text-slate">
          {roleLabel ?? 'Pharmacy workspace'}
          {profile?.user.email ? ` · ${profile.user.email}` : ''}
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="px-2 py-1 text-xs font-medium uppercase text-slate">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
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
        {visibleMobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
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

  /**
   * Below `md` the sidebar is replaced by the bottom bar, which can only hold
   * five destinations. The drawer shows every sidebar link so nothing is
   * unreachable on a phone or tablet; it renders the same `sidebarContent` as
   * the desktop aside instead of a second copy of the navigation.
   */
  const mobileDrawer = menuOpen ? (
    <div className="fixed inset-0 z-50 md:hidden" id="app-navigation-drawer">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 h-full w-full bg-ink/40"
        onClick={() => setMenuOpen(false)}
      />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-surface shadow-xl">
        <div className="flex justify-end p-2">
          <button
            type="button"
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {sidebarContent}
      </div>
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen md:flex">
        <aside className="hidden w-64 flex-col border-r bg-surface md:flex">
          {sidebarContent}
        </aside>
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b bg-surface">
            <div className="flex h-16 items-center justify-between gap-2 px-4 md:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Open navigation"
                  aria-expanded={menuOpen}
                  aria-controls="app-navigation-drawer"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-white text-ink hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 md:hidden"
                  onClick={() => setMenuOpen(true)}
                >
                  <Menu className="h-4 w-4" aria-hidden="true" />
                </button>
                <p className="hidden truncate text-sm font-semibold text-ink sm:block">
                  {workspaceName}
                </p>
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <BranchSwitcher />
                <NotificationBell />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleSignOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            </div>
          </header>
          {/* The bottom bar is fixed, so the last row of every page needs room. */}
          <main className="flex-1 p-4 pb-24 md:p-6">{children}</main>
        </div>
      </div>
      <ExpiryAlertDialog />
      {mobileDrawer}
      {mobileContent}
    </div>
  );
}
