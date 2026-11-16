'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Mail, RotateCcw, Trash2, UserPlus } from 'lucide-react';
import { apiFetch } from '@/services/api';
import {
  DailyReport,
  DailyReportSendResult,
  NotificationCapabilities,
  NotificationDelivery,
  NotificationPreferences,
  NotificationRecipient,
} from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, formatDateTime } from '@/lib/format';

/** A short list keeps the field usable without turning it into a huge select. */
const TIMEZONE_SUGGESTIONS = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/London',
  'America/New_York',
  'Asia/Dubai',
  'Asia/Kolkata',
];

const DELIVERY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function NotificationSettings() {
  const preferences = useQuery<NotificationPreferences>({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => apiFetch<NotificationPreferences>('/notifications/preferences'),
  });

  const capabilities = useQuery<NotificationCapabilities>({
    queryKey: ['notifications', 'capabilities'],
    queryFn: () => apiFetch<NotificationCapabilities>('/notifications/capabilities'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notification settings</h1>
          <p className="text-sm text-slate">
            Configure expiry reminders, email recipients and review delivery history for this
            workspace.
          </p>
        </div>
        <Link
          href="/notifications"
          className="inline-flex h-10 items-center rounded-md border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-background"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Notification centre
        </Link>
      </div>

      {capabilities.data && capabilities.data.emailTransport === 'log' ? (
        <Alert tone="warning" title="Email delivery is running in log mode">
          Messages are recorded in the delivery history and written to the server log. Configure an
          email provider (<code>EMAIL_TRANSPORT=http</code>) before relying on email reminders.
        </Alert>
      ) : null}

      {preferences.isLoading ? (
        <Card className="p-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-4 h-24 w-full" />
        </Card>
      ) : null}

      {preferences.error ? (
        <Alert tone="danger" title="Unable to load notification settings">
          {preferences.error instanceof Error ? preferences.error.message : 'Please try again.'}
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => preferences.refetch()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : null}

      {preferences.data ? <PreferencesForm initial={preferences.data} /> : null}

      <DailySalesReportCard />

      <RecipientsCard />

      <DeliveriesCard />
    </div>
  );
}

function PreferencesForm({ initial }: { initial: NotificationPreferences }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    inAppEnabled: initial.inAppEnabled,
    emailEnabled: initial.emailEnabled,
    expiryRemindersEnabled: initial.expiryRemindersEnabled,
    saleNotificationsEnabled: initial.saleNotificationsEnabled,
    reminderLeadDays: String(initial.reminderLeadDays),
    reminderIntervalDays: String(initial.reminderIntervalDays),
    dailyReportEnabled: initial.dailyReportEnabled,
    dailyReportTime: initial.dailyReportTime,
    dailyReportTimezone: initial.dailyReportTimezone ?? '',
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<NotificationPreferences>('/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          inAppEnabled: form.inAppEnabled,
          emailEnabled: form.emailEnabled,
          expiryRemindersEnabled: form.expiryRemindersEnabled,
          saleNotificationsEnabled: form.saleNotificationsEnabled,
          reminderLeadDays: Number(form.reminderLeadDays),
          reminderIntervalDays: Number(form.reminderIntervalDays),
          dailyReportEnabled: form.dailyReportEnabled,
          dailyReportTime: form.dailyReportTime,
          // An empty value clears the override so the workspace timezone applies.
          dailyReportTimezone: form.dailyReportTimezone.trim(),
        }),
      }),
    onSuccess: () => {
      setFeedback('Notification preferences saved.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  const leadDays = Number(form.reminderLeadDays);
  const intervalDays = Number(form.reminderIntervalDays);
  const scheduleInvalid =
    !Number.isFinite(leadDays) ||
    leadDays < 1 ||
    leadDays > 365 ||
    !Number.isFinite(intervalDays) ||
    intervalDays < 1 ||
    intervalDays > 30;
  const deliveryTimeInvalid = !DELIVERY_TIME_PATTERN.test(form.dailyReportTime);

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <Mail className="h-5 w-5 text-info" aria-hidden="true" />
        Expiry reminder preferences
      </h2>
      <p className="mt-1 text-sm text-slate">
        Applies to every batch in this workspace. Reminders are sent at 90, 60, 30 and 7 days before
        expiry and again once a batch has expired. Changes take effect on the next scheduled scan or
        when you run a scan manually.
      </p>

      {feedback ? (
        <Alert tone={save.isError ? 'danger' : 'success'} className="mt-4">
          {feedback}
        </Alert>
      ) : null}

      <div className="mt-4 space-y-4">
        <Switch
          id="expiry-reminders"
          label="Expiry reminders"
          description="Create reminders for batches inside the reminder window."
          checked={form.expiryRemindersEnabled}
          onCheckedChange={(checked) => setForm((current) => ({ ...current, expiryRemindersEnabled: checked }))}
        />
        <Switch
          id="in-app"
          label="In-app notifications"
          description="Show reminders in the notification centre and header bell."
          checked={form.inAppEnabled}
          onCheckedChange={(checked) => setForm((current) => ({ ...current, inAppEnabled: checked }))}
        />
        <Switch
          id="email"
          label="Email notifications"
          description="Send reminders to the active recipients configured below."
          checked={form.emailEnabled}
          onCheckedChange={(checked) => setForm((current) => ({ ...current, emailEnabled: checked }))}
        />
        <Switch
          id="sale-notifications"
          label="Sale notifications"
          description="Notify the workspace when a sale is recorded or a return is refunded."
          checked={form.saleNotificationsEnabled}
          onCheckedChange={(checked) =>
            setForm((current) => ({ ...current, saleNotificationsEnabled: checked }))
          }
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink">Reminder lead time (days)</span>
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={365}
            value={form.reminderLeadDays}
            onChange={(event) =>
              setForm((current) => ({ ...current, reminderLeadDays: event.target.value }))
            }
          />
          <span className="mt-1 block text-xs text-slate">
            Reminders start this many days before the expiry date. Default 90.
          </span>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Repeat every (days)</span>
          <Input
            className="mt-1"
            type="number"
            min={1}
            max={30}
            value={form.reminderIntervalDays}
            onChange={(event) =>
              setForm((current) => ({ ...current, reminderIntervalDays: event.target.value }))
            }
          />
          <span className="mt-1 block text-xs text-slate">
            Reminder interval until the batch is depleted, written off or returned. Default 7.
          </span>
        </label>
      </div>

      {scheduleInvalid ? (
        <Alert tone="warning" className="mt-4">
          Lead time must be between 7 and 365 days and the interval between 1 and 60 days.
        </Alert>
      ) : null}

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="text-sm font-semibold text-ink">Daily sales report</h3>
        <p className="mt-1 text-xs text-slate">
          Revenue, refunds and profit are reported separately. A day without sales still produces a
          report, and each business date is only sent once.
        </p>
        <div className="mt-3">
          <Switch
            id="daily-report"
            label="Send the daily summary"
            description="Email the sales summary to recipients who receive sales reports."
            checked={form.dailyReportEnabled}
            onCheckedChange={(checked) =>
              setForm((current) => ({ ...current, dailyReportEnabled: checked }))
            }
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-ink">Delivery time</span>
            <Input
              className="mt-1"
              type="time"
              value={form.dailyReportTime}
              aria-invalid={deliveryTimeInvalid ? true : undefined}
              onChange={(event) =>
                setForm((current) => ({ ...current, dailyReportTime: event.target.value }))
              }
            />
            <span className="mt-1 block text-xs text-slate">
              Local time in the reporting timezone. Default 20:00.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-ink">Reporting timezone</span>
            <Input
              className="mt-1"
              value={form.dailyReportTimezone}
              list="daily-report-timezones"
              placeholder="Use the workspace timezone"
              onChange={(event) =>
                setForm((current) => ({ ...current, dailyReportTimezone: event.target.value }))
              }
            />
            <datalist id="daily-report-timezones">
              {TIMEZONE_SUGGESTIONS.map((zone) => (
                <option key={zone} value={zone} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-slate">
              Leave blank to follow the workspace timezone.
            </span>
          </label>
        </div>
        {deliveryTimeInvalid ? (
          <Alert tone="warning" className="mt-4">
            Delivery time must use the 24-hour HH:mm format.
          </Alert>
        ) : null}
      </div>

      <Button
        className="mt-4"
        onClick={() => save.mutate()}
        disabled={save.isPending || scheduleInvalid || deliveryTimeInvalid}
      >
        {save.isPending ? 'Saving…' : 'Save preferences'}
      </Button>
    </Card>
  );
}

function DailySalesReportCard() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [result, setResult] = useState<DailyReportSendResult | null>(null);

  const report = useQuery<DailyReport>({
    queryKey: ['notifications', 'daily-report', date],
    queryFn: () =>
      apiFetch<DailyReport>(`/notifications/daily-report${date ? `?date=${date}` : ''}`),
  });

  const sendNow = useMutation({
    mutationFn: () =>
      apiFetch<DailyReportSendResult>('/notifications/daily-report/send', {
        method: 'POST',
        body: JSON.stringify(date ? { date } : {}),
      }),
    onSuccess: (sent) => {
      setResult(sent);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const summary = report.data?.summary;
  const currency = report.data?.currency ?? 'NGN';
  const costMissing = summary?.cogs === null;

  const rows = summary
    ? [
        {
          label: 'Revenue',
          value: formatCurrency(summary.revenue, currency),
          hint: 'Completed sales after discounts. Revenue is not profit.',
        },
        { label: 'Transactions', value: String(summary.transactions) },
        { label: 'Units sold', value: String(summary.unitsSold) },
        { label: 'Gross sales', value: formatCurrency(summary.grossSales, currency) },
        { label: 'Discounts', value: formatCurrency(summary.discounts, currency) },
        { label: 'Refunds', value: formatCurrency(summary.refunds, currency) },
        { label: 'Net sales', value: formatCurrency(summary.netSales, currency) },
        {
          label: 'Cost of goods sold',
          value: formatCurrency(summary.cogs, currency),
          hint: costMissing ? 'Some sold batches have no purchase cost recorded.' : undefined,
        },
        {
          label: 'Gross profit',
          value: formatCurrency(summary.grossProfit, currency),
          hint: costMissing ? 'Not shown while a purchase cost is missing.' : undefined,
        },
      ]
    : [];

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Daily sales summary</h2>
          <p className="mt-1 text-sm text-slate">
            Preview exactly what the scheduled email reports. Revenue, refunds and profit stay
            separate, and the figures come from completed sales only.
          </p>
        </div>
        {report.data ? (
          <Badge status={report.data.alreadySent ? 'success' : 'neutral'}>
            {report.data.alreadySent ? 'Already sent' : 'Not sent yet'}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block text-sm">
          <span className="font-medium text-ink">Business date</span>
          <Input
            className="mt-1"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setResult(null);
            }}
          />
        </label>
        <Button variant="outline" onClick={() => report.refetch()} disabled={report.isFetching}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          {report.isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
        <Button
          onClick={() => sendNow.mutate()}
          disabled={sendNow.isPending || !report.data}
        >
          {sendNow.isPending ? 'Sending…' : 'Send this report now'}
        </Button>
      </div>

      {report.error ? (
        <Alert tone="danger" className="mt-4" title="Unable to build the summary">
          {report.error instanceof Error ? report.error.message : 'Please try again.'}
        </Alert>
      ) : null}

      {sendNow.error ? (
        <Alert tone="danger" className="mt-4" title="The report was not sent">
          {sendNow.error instanceof Error ? sendNow.error.message : 'Please try again.'}
        </Alert>
      ) : null}

      {result ? (
        <Alert
          tone={result.skipped ? 'warning' : 'success'}
          className="mt-4"
          title={result.skipped ? 'Nothing was sent' : `Report for ${result.report.date} sent`}
        >
          {result.skipped
            ? result.reason ?? 'This report is not due or was already delivered.'
            : `${result.emailsQueued} email(s) queued, ${result.emailsSent} delivered, ${result.emailsFailed} failed.`}
        </Alert>
      ) : null}

      {report.isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : null}

      {report.data && summary ? (
        <>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <div key={row.label} className="rounded-md border border-border p-3">
                <dt className="text-xs text-slate">{row.label}</dt>
                <dd className="text-base font-semibold text-ink">{row.value}</dd>
                {row.hint ? <p className="mt-1 text-xs text-slate">{row.hint}</p> : null}
              </div>
            ))}
          </dl>

          <p className="mt-3 text-xs text-slate">
            {report.data.pharmacyName} · {report.data.date} · {report.data.timeZone} · delivers at{' '}
            {report.data.deliveryTime}
          </p>
          <p className="mt-1 text-xs text-slate">
            {report.data.recipients.length === 0
              ? 'No recipient receives sales reports yet. Add one below and turn on sales reports for it.'
              : `Recipients: ${report.data.recipients.join(', ')}`}
          </p>
        </>
      ) : null}
    </Card>
  );
}

function RecipientsCard() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [receivesExpiry, setReceivesExpiry] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recipients = useQuery<NotificationRecipient[]>({
    queryKey: ['notifications', 'recipients'],
    queryFn: () => apiFetch<NotificationRecipient[]>('/notifications/recipients'),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications', 'recipients'] });

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/notifications/recipients', {
        method: 'POST',
        body: JSON.stringify({ email, name: name || undefined, receivesExpiry }),
      }),
    onSuccess: () => {
      setEmail('');
      setName('');
      setReceivesExpiry(true);
      setError(null);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const update = useMutation({
    mutationFn: (input: { id: string; body: Record<string, unknown> }) =>
      apiFetch(`/notifications/recipients/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify(input.body),
      }),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/recipients/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    create.mutate();
  };

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <UserPlus className="h-5 w-5 text-info" aria-hidden="true" />
        Email recipients
      </h2>
      <p className="mt-1 text-sm text-slate">
        Only active recipients receive expiry reminder emails. Removing a recipient keeps the
        delivery history.
      </p>

      {error ? (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={submit}>
        <label className="block text-sm">
          <span className="font-medium text-ink">Email</span>
          <Input
            className="mt-1"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="pharmacist@example.com"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-ink">Name (optional)</span>
          <Input
            className="mt-1"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Adaeze Okonkwo"
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={create.isPending || !email.trim()} className="w-full">
            {create.isPending ? 'Adding…' : 'Add recipient'}
          </Button>
        </div>
      </form>

      <div className="mt-3">
        <Switch
          id="recipient-expiry"
          label="Receive expiry reminders"
          description="New recipients receive expiry reminders by default."
          checked={receivesExpiry}
          onCheckedChange={setReceivesExpiry}
        />
      </div>

      <div className="mt-6">
        {recipients.isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : null}

        {recipients.error ? (
          <div>
            <p className="text-sm text-danger">
              {recipients.error instanceof Error
                ? recipients.error.message
                : 'Unable to load recipients.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => recipients.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {recipients.data && recipients.data.length === 0 ? (
          <p className="text-sm text-slate">
            No recipients configured. Add at least one email address to send email reminders.
          </p>
        ) : null}

        {recipients.data && recipients.data.length > 0 ? (
          <ul className="space-y-2">
            {recipients.data.map((recipient) => (
              <li
                key={recipient.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{recipient.name ?? recipient.email}</p>
                  <p className="text-xs text-slate">
                    {recipient.name ? `${recipient.email} · ` : ''}
                    {recipient.receivesExpiry ? 'Expiry reminders' : 'No expiry reminders'} ·{' '}
                    {recipient.receivesSales ? 'daily reports' : 'no daily reports'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={recipient.active ? 'success' : 'neutral'}>
                    {recipient.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update.mutate({
                        id: recipient.id,
                        body: { active: !recipient.active },
                      })
                    }
                    disabled={update.isPending}
                  >
                    {recipient.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update.mutate({
                        id: recipient.id,
                        body: { receivesExpiry: !recipient.receivesExpiry },
                      })
                    }
                    disabled={update.isPending}
                  >
                    {recipient.receivesExpiry ? 'Mute expiry' : 'Unmute expiry'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      update.mutate({
                        id: recipient.id,
                        body: { receivesSales: !recipient.receivesSales },
                      })
                    }
                    disabled={update.isPending}
                  >
                    {recipient.receivesSales ? 'Stop daily reports' : 'Send daily reports'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(recipient.id)}
                    disabled={remove.isPending || !recipient.active}
                    aria-label={`Remove ${recipient.email}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}

function DeliveriesCard() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const deliveries = useQuery<NotificationDelivery[]>({
    queryKey: ['notifications', 'deliveries'],
    queryFn: () => apiFetch<NotificationDelivery[]>('/notifications/deliveries?limit=25'),
  });

  const retry = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/deliveries/${id}/retry`, { method: 'POST' }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'deliveries'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Email delivery history</h2>
        <Button variant="outline" size="sm" onClick={() => deliveries.refetch()}>
          <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
          Refresh
        </Button>
      </div>
      <p className="mt-1 text-sm text-slate">
        Every reminder email is tracked. Failed deliveries are retried automatically with backoff
        until the maximum attempt count is reached.
      </p>

      {error ? (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {deliveries.isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : null}

      {deliveries.error ? (
        <div className="mt-4">
          <p className="text-sm text-danger">
            {deliveries.error instanceof Error
              ? deliveries.error.message
              : 'Unable to load delivery history.'}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => deliveries.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {deliveries.data && deliveries.data.length === 0 ? (
        <p className="mt-4 text-sm text-slate">No emails have been queued yet.</p>
      ) : null}

      {deliveries.data && deliveries.data.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-slate">
                <th scope="col" className="py-2 pr-3">Reminder</th>
                <th scope="col" className="py-2 pr-3">Recipient</th>
                <th scope="col" className="py-2 pr-3">Status</th>
                <th scope="col" className="py-2 pr-3">Attempts</th>
                <th scope="col" className="py-2 pr-3">Next attempt</th>
                <th scope="col" className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.data.map((delivery) => (
                <tr key={delivery.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-ink">
                      {delivery.notificationTitle ?? 'Expiry reminder'}
                    </p>
                    <p className="text-xs text-slate">{formatDateTime(delivery.createdAt)}</p>
                  </td>
                  <td className="py-2 pr-3 text-xs text-slate">{delivery.recipient}</td>
                  <td className="py-2 pr-3">
                    <Badge
                      status={
                        delivery.status === 'SENT'
                          ? 'success'
                          : delivery.status === 'FAILED'
                            ? 'danger'
                            : 'info'
                      }
                    >
                      {delivery.status}
                    </Badge>
                    {delivery.lastError ? (
                      <p className="mt-1 max-w-xs text-xs text-danger">{delivery.lastError}</p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-xs text-slate">{delivery.attempts}</td>
                  <td className="py-2 pr-3 text-xs text-slate">
                    {delivery.nextAttemptAt ? formatDateTime(delivery.nextAttemptAt) : '—'}
                  </td>
                  <td className="py-2">
                    {delivery.status !== 'SENT' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retry.mutate(delivery.id)}
                        disabled={retry.isPending}
                      >
                        Retry
                      </Button>
                    ) : (
                      <span className="text-xs text-slate">Delivered</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}
