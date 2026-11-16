'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, RefreshCw, Settings } from 'lucide-react';
import { apiFetch } from '@/services/api';
import {
  AppNotification,
  ExpiryScanSummary,
  NotificationCapabilities,
  NotificationPreferences,
} from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationList } from '@/components/notifications/notification-list';

type Filter = 'all' | 'unread';

export function NotificationCentre() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [scanSummary, setScanSummary] = useState<ExpiryScanSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const notifications = useQuery<AppNotification[]>({
    queryKey: ['notifications', 'list', filter],
    queryFn: () =>
      apiFetch<AppNotification[]>(
        `/notifications?limit=100${filter === 'unread' ? '&unreadOnly=true' : ''}`,
      ),
    refetchInterval: 60_000,
  });

  const capabilities = useQuery<NotificationCapabilities>({
    queryKey: ['notifications', 'capabilities'],
    queryFn: () => apiFetch<NotificationCapabilities>('/notifications/capabilities'),
  });

  const preferences = useQuery<NotificationPreferences>({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => apiFetch<NotificationPreferences>('/notifications/preferences'),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: invalidate,
    onError: (error: Error) => setActionError(error.message),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: invalidate,
    onError: (error: Error) => setActionError(error.message),
  });

  const runScan = useMutation({
    mutationFn: () => apiFetch<ExpiryScanSummary>('/notifications/expiry-scan', { method: 'POST' }),
    onSuccess: (summary) => {
      setScanSummary(summary);
      setActionError(null);
      invalidate();
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const leadDays = preferences.data?.reminderLeadDays ?? 90;
  const intervalDays = preferences.data?.reminderIntervalDays ?? 7;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
          <p className="text-sm text-slate">
            Expiry reminders and workspace alerts. Reminders start {leadDays} days before expiry and
            repeat every {intervalDays} day(s) until the batch is removed from stock.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => runScan.mutate()}
            disabled={runScan.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${runScan.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
            {runScan.isPending ? 'Scanning…' : 'Run expiry scan'}
          </Button>
          <Link
            href="/notifications/settings"
            className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            Notification settings
          </Link>
        </div>
      </div>

      {capabilities.data && !capabilities.data.salesNotificationsAvailable ? (
        <Alert tone="info" title="Sale notifications are not available yet">
          The platform does not record sales transactions, so no sale notifications are produced.
          Expiry reminders are fully supported.
        </Alert>
      ) : null}

      {capabilities.data?.emailTransport === 'log' ? (
        <Alert tone="warning" title="Email delivery is running in log mode">
          Emails are recorded in the delivery history and written to the server log only. Configure
          an email provider (<code>EMAIL_TRANSPORT=http</code>) to deliver real messages.
        </Alert>
      ) : null}

      {scanSummary ? (
        <Alert
          tone="success"
          title="Expiry scan completed"
          action={
            <Button variant="ghost" size="sm" onClick={() => setScanSummary(null)}>
              Dismiss
            </Button>
          }
        >
          {scanSummary.remindersCreated} reminder(s) created, {scanSummary.alreadyNotified} already
          sent for this period, {scanSummary.emailsQueued} email(s) queued, {scanSummary.emailsSent}{' '}
          sent and {scanSummary.emailsFailed} failed.
        </Alert>
      ) : null}

      {actionError ? (
        <Alert tone="danger" title="Action failed">
          {actionError}
        </Alert>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2" role="tablist" aria-label="Notification filter">
            <Button
              role="tab"
              aria-selected={filter === 'all'}
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All notifications
            </Button>
            <Button
              role="tab"
              aria-selected={filter === 'unread'}
              variant={filter === 'unread' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread only
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => notifications.refetch()}
              disabled={notifications.isFetching}
            >
              <RefreshCw className="mr-1 h-3 w-3" aria-hidden="true" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              Mark all read
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {notifications.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : null}

          {notifications.error ? (
            <div>
              <p className="text-sm text-danger">
                {notifications.error instanceof Error
                  ? notifications.error.message
                  : 'Unable to load notifications.'}
              </p>
              <Button variant="outline" className="mt-3" onClick={() => notifications.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}

          {notifications.data ? (
            <NotificationList
              notifications={notifications.data}
              onMarkRead={(id) => markRead.mutate(id)}
              markingId={markRead.isPending ? markRead.variables ?? null : null}
              emptyMessage={
                filter === 'unread'
                  ? 'Nothing unread. You are up to date.'
                  : 'No notifications yet. Reminders appear here when batches enter the expiry reminder window.'
              }
            />
          ) : null}
        </div>
      </Card>
    </div>
  );
}
