'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { NotificationUnreadCount } from '@/types/api';

/**
 * Header bell. The unread count is polled so operational reminders appear
 * without a page reload; the notification centre remains the source of truth.
 */
export function NotificationBell() {
  const { data } = useQuery<NotificationUnreadCount>({
    queryKey: ['notifications', 'unread-count'],
    // A background poll on a header badge: a popup every minute the server is
    // unreachable would be worse than a stale count.
    meta: { silent: true },
    queryFn: () => apiFetch<NotificationUnreadCount>('/notifications/unread-count'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  if (data && !data.inAppEnabled) {
    return null;
  }

  const unread = data?.unread ?? 0;
  const label = unread > 0 ? `Notifications, ${unread} unread` : 'Notifications';

  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-ink hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
