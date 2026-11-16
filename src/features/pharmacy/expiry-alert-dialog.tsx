'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ExternalLink, Search, X } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { ExpiryAlerts, ExpiryAlertItem, ExpiryBucket } from '@/types/api';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { hasSeenExpiryAlert, markExpiryAlertSeen } from '@/lib/expiry-popup';

type PeriodFilter = 'ALL' | 'EXPIRED' | 'WITHIN_30' | 'WITHIN_60' | 'WITHIN_90';

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'EXPIRED', label: 'Expired' },
  { key: 'WITHIN_30', label: '30 days' },
  { key: 'WITHIN_60', label: '60 days' },
  { key: 'WITHIN_90', label: '90 days' },
];

/** Red for expired, orange within 30 days, yellow for the 60 and 90 day buckets. */
const BUCKET_TONE: Record<ExpiryBucket, string> = {
  EXPIRED: 'border-danger/30 bg-danger-soft text-danger',
  WITHIN_30: 'border-warning/40 bg-warning-soft text-warning',
  WITHIN_60: 'border-[#FDE68A] bg-[#FEF9C3] text-[#854D0E]',
  WITHIN_90: 'border-[#FEF08A] bg-[#FEFCE8] text-[#A16207]',
  BEYOND: 'border-success/30 bg-success-soft text-success',
};

const MAX_VISIBLE_ROWS = 30;

const BUCKET_RANK: Record<ExpiryBucket, number> = {
  EXPIRED: 0,
  WITHIN_30: 1,
  WITHIN_60: 2,
  WITHIN_90: 3,
  BEYOND: 4,
};

function matchesPeriod(item: ExpiryAlertItem, period: PeriodFilter): boolean {
  if (period === 'ALL') return item.bucket !== 'BEYOND';
  if (period === 'EXPIRED') return item.bucket === 'EXPIRED';
  const limit = period === 'WITHIN_30' ? 1 : period === 'WITHIN_60' ? 2 : 3;
  return BUCKET_RANK[item.bucket] >= 0 && BUCKET_RANK[item.bucket] <= limit;
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ago`;
  if (days === 0) return 'Expires today';
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

/**
 * Expiry alert shown once per sign-in, before the user starts work.
 *
 * It is batch based: one medicine can appear several times, once per batch, and
 * batches without remaining stock are never listed. It only opens when there is
 * something to review, and dismissing it is remembered for the session.
 */
export function ExpiryAlertDialog() {
  const { profile } = useAuth();
  const organizationId = profile?.organisation.id;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('ALL');

  useEffect(() => {
    if (!organizationId) return;
    if (hasSeenExpiryAlert(organizationId)) return;
    setOpen(true);
  }, [organizationId]);

  const alerts = useQuery<ExpiryAlerts>({
    queryKey: ['pharmacy', 'expiry', 'alerts', 90],
    queryFn: () => apiFetch<ExpiryAlerts>('/pharmacy/expiry/alerts?days=90'),
    enabled: open && Boolean(organizationId),
    staleTime: 60_000,
  });

  const dismiss = () => {
    setOpen(false);
    if (organizationId) markExpiryAlertSeen(organizationId);
  };

  // Nothing needs attention: close quietly instead of showing an empty popup.
  const isEmpty = open && Boolean(alerts.data) && alerts.data!.items.length === 0;
  useEffect(() => {
    if (!isEmpty) return;
    setOpen(false);
    if (organizationId) markExpiryAlertSeen(organizationId);
  }, [isEmpty, organizationId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      if (organizationId) markExpiryAlertSeen(organizationId);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, organizationId]);

  const items = useMemo(() => {
    const data = alerts.data;
    if (!data) return [];
    const term = search.trim().toLowerCase();
    return data.items.filter((item) => {
      if (!matchesPeriod(item, period)) return false;
      if (!term) return true;
      return (
        item.medicineName.toLowerCase().includes(term) ||
        (item.batchNumber ?? '').toLowerCase().includes(term)
      );
    });
  }, [alerts.data, period, search]);

  if (!open) return null;

  const counts = alerts.data?.counts;
  const totals = alerts.data?.totals;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="expiry-alert-title"
        className="w-full max-w-2xl rounded-lg border border-border bg-surface shadow-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 id="expiry-alert-title" className="flex items-center gap-2 text-lg font-semibold text-ink">
              <CalendarClock className="h-5 w-5 text-warning" aria-hidden="true" />
              Expiry attention needed
            </h2>
            <p className="mt-1 text-sm text-slate">
              Batches that still hold stock and expire within 90 days, or have already expired.
              Expired stock cannot be sold.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={dismiss} aria-label="Close expiry alert">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {alerts.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : null}

        {alerts.error ? (
          <div className="p-4">
            <p className="text-sm text-danger">
              {alerts.error instanceof Error
                ? alerts.error.message
                : 'Unable to load expiry alerts.'}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => alerts.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {alerts.data ? (
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <Badge status="danger">Expired {counts?.expired ?? 0}</Badge>
              <Badge status="warning">Within 30 days {counts?.within30 ?? 0}</Badge>
              <Badge status="neutral">Within 60 days {counts?.within60 ?? 0}</Badge>
              <Badge status="neutral">Within 90 days {counts?.within90 ?? 0}</Badge>
              {totals?.valueAtRisk !== null && totals?.valueAtRisk !== undefined ? (
                <Badge status="info">Value at risk {formatCurrency(totals.valueAtRisk)}</Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
                  aria-hidden="true"
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search medicine or batch"
                  className="pl-8"
                  aria-label="Search expiry batches"
                />
              </div>
              <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by expiry period">
                {PERIOD_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    size="sm"
                    variant={period === option.key ? 'primary' : 'outline'}
                    onClick={() => setPeriod(option.key)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="max-h-[45vh] overflow-y-auto rounded-md border border-border">
              {items.length === 0 ? (
                <p className="p-4 text-sm text-slate">
                  No batches match this search or period filter.
                </p>
              ) : (
                items.slice(0, MAX_VISIBLE_ROWS).map((item) => (
                  <div key={item.batchId} className="border-b border-border p-3 last:border-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{item.medicineName}</p>
                        <p className="text-xs text-slate">
                          Batch {item.batchNumber ?? 'not recorded'} · Expires {item.expiryDate}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-xs font-medium',
                          BUCKET_TONE[item.bucket],
                        )}
                      >
                        {daysLabel(item.daysRemaining)}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                      <div>
                        <dt className="text-slate">Remaining</dt>
                        <dd className="font-medium text-ink">
                          {item.quantity} {item.unit}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate">Stock value</dt>
                        <dd className="font-medium text-ink">
                          {item.valueAtRisk === null
                            ? 'Purchase cost not recorded'
                            : formatCurrency(item.valueAtRisk)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate">Status</dt>
                        <dd className="font-medium text-ink">{item.statusLabel}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`/products/pharmacy/batches?productId=${item.productId}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                    >
                      Open inventory record
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                ))
              )}
            </div>

            {items.length > MAX_VISIBLE_ROWS ? (
              <p className="text-xs text-slate">
                Showing the {MAX_VISIBLE_ROWS} closest to expiry of {items.length} matching
                batches. Use the expiry screen for the full list.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-4">
          <Link
            href="/products/pharmacy/expiry"
            onClick={dismiss}
            className="text-sm font-medium text-primary-700 hover:underline"
          >
            View all expiry batches
          </Link>
          <Button onClick={dismiss}>Dismiss for this session</Button>
        </div>
      </div>
    </div>
  );
}
