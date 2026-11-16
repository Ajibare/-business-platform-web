'use client';

import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { AppNotification } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const severityStatus = (severity: string) => {
  if (severity === 'danger') return 'danger' as const;
  if (severity === 'warning') return 'warning' as const;
  return 'info' as const;
};

interface NotificationListProps {
  notifications: AppNotification[];
  onMarkRead?: (id: string) => void;
  markingId?: string | null;
  emptyMessage?: string;
}

export function NotificationList({
  notifications,
  onMarkRead,
  markingId,
  emptyMessage = 'No notifications yet.',
}: NotificationListProps) {
  if (notifications.length === 0) {
    return <p className="text-sm text-slate">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {notifications.map((notification) => {
        const unread = !notification.readAt;

        return (
          <li
            key={notification.id}
            className={cn(
              'rounded-md border p-3',
              unread ? 'border-primary-600/40 bg-primary-50' : 'border-border bg-surface',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Bell
                  className={cn('mt-0.5 h-4 w-4 shrink-0', unread ? 'text-primary-700' : 'text-slate')}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-ink">{notification.title}</p>
                  <p className="mt-1 whitespace-pre-line text-xs text-slate">{notification.body}</p>
                  <p className="mt-2 text-xs text-slate">
                    {formatDateTime(notification.createdAt)}
                    {unread ? ' · Unread' : ' · Read'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge status={severityStatus(notification.severity)}>
                  {notification.severity === 'danger' ? 'Urgent' : 'Reminder'}
                </Badge>
                {notification.type === 'EXPIRY_REMINDER' ? (
                  <Link
                    href="/products/pharmacy/expiry"
                    className="text-xs font-medium text-primary-700 hover:underline"
                  >
                    View expiry monitor
                  </Link>
                ) : null}
                {unread && onMarkRead ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkRead(notification.id)}
                    disabled={markingId === notification.id}
                  >
                    <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                    Mark read
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
