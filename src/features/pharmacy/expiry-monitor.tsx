'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, Search } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { ExpiryAlertItem, ExpiryAlerts, ExpiryBatch } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SectionLoader } from '@/components/ui/loading';
import { formatCurrency, formatDate } from '@/lib/format';

type PeriodFilter = 'ALL' | 'EXPIRED' | 'WITHIN_30' | 'WITHIN_60' | 'WITHIN_90';

const PERIODS: Array<{ value: PeriodFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'WITHIN_30', label: '30 days' },
  { value: 'WITHIN_60', label: '60 days' },
  { value: 'WITHIN_90', label: '90 days' },
];

const BUCKET_STYLES: Record<string, { row: string; pill: string }> = {
  EXPIRED: { row: 'border-danger/40', pill: 'bg-danger/10 text-danger' },
  WITHIN_30: { row: 'border-warning/40', pill: 'bg-warning/10 text-warning' },
  WITHIN_60: { row: 'border-[#FDE68A]', pill: 'bg-[#FEF9C3] text-[#854D0E]' },
  WITHIN_90: { row: 'border-[#FEF08A]', pill: 'bg-[#FEFCE8] text-[#A16207]' },
  BEYOND: { row: 'border-border', pill: 'bg-success/10 text-success' },
};

function matchesPeriod(item: ExpiryAlertItem, period: PeriodFilter): boolean {
  if (period === 'ALL') return true;
  if (period === 'EXPIRED') return item.bucket === 'EXPIRED';
  if (period === 'WITHIN_30') return item.daysRemaining >= 0 && item.daysRemaining <= 30;
  if (period === 'WITHIN_60') return item.daysRemaining >= 0 && item.daysRemaining <= 60;
  return item.daysRemaining >= 0 && item.daysRemaining <= 90;
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day(s) ago`;
  if (days === 0) return 'Expires today';
  return `${days} day(s) left`;
}

export function ExpiryMonitor() {
  const [period, setPeriod] = useState<PeriodFilter>('ALL');
  const [search, setSearch] = useState('');

  const alerts = useQuery<ExpiryAlerts>({
    queryKey: ['pharmacy', 'expiry', 'alerts', 90],
    // Each table prints its own failure.
    meta: { silent: true },
    queryFn: () => apiFetch<ExpiryAlerts>('/pharmacy/expiry/alerts?days=90'),
  });

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

  const counts = alerts.data?.counts;
  const totals = alerts.data?.totals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Expiry monitoring</h1>
        <p className="text-sm text-slate">
          Batches by expiry risk. Every row is one batch with stock left; expired stock is never
          sold. Quantities are recorded balances, not physically verified.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate">Expired</p>
          <p className="text-2xl font-semibold text-danger">{counts?.expired ?? 0}</p>
          <p className="text-xs text-slate">batches past expiry with stock</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate">Within 30 days</p>
          <p className="text-2xl font-semibold text-warning">{counts?.within30 ?? 0}</p>
          <p className="text-xs text-slate">sell first, or plan a return</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate">Within 60 days</p>
          <p className="text-2xl font-semibold text-[#854D0E]">{counts?.within60 ?? 0}</p>
          <p className="text-xs text-slate">watch these batches</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate">Within 90 days</p>
          <p className="text-2xl font-semibold text-[#A16207]">{counts?.within90 ?? 0}</p>
          <p className="text-xs text-slate">plan ahead before stock is stranded</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CalendarClock className="h-4 w-4 text-info" aria-hidden="true" />
              Expiry alerts
            </h2>
            <p className="text-xs text-slate">
              {totals ? `${totals.batches} batch(es) across ${totals.medicines} medicine(s)` : ' '}
              {totals?.valueAtRisk !== null && totals?.valueAtRisk !== undefined
                ? ` · ${formatCurrency(totals.valueAtRisk)} at risk`
                : ' · value at risk unavailable'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {PERIODS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={period === option.value ? 'primary' : 'outline'}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <label className="mt-3 block text-xs">
          <span className="sr-only">Search expiry alerts</span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
              aria-hidden="true"
            />
            <Input
              className="pl-8"
              value={search}
              placeholder="Search a medicine or batch number"
              onChange={(event) => setSearch(event.target.value)}
            />
          </span>
        </label>

        {alerts.isLoading ? <SectionLoader label="Loading expiry alerts…" /> : null}

        {alerts.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {alerts.error instanceof Error
                ? alerts.error.message
                : 'Unable to load expiry alerts.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => alerts.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {alerts.data && items.length === 0 ? (
          <p className="mt-4 text-sm text-slate">
            {alerts.data.items.length === 0
              ? 'No batch needs attention in the next 90 days.'
              : 'No batch matches this filter.'}
          </p>
        ) : null}

        {items.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {items.map((item) => {
              const style = BUCKET_STYLES[item.bucket] ?? BUCKET_STYLES.BEYOND;
              return (
                <li
                  key={item.batchId}
                  className={`rounded-md border p-3 ${style.row}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{item.medicineName}</p>
                      <p className="text-xs text-slate">
                        Batch {item.batchNumber ?? '—'} · expires {formatDate(item.expiryDate)} ·{' '}
                        {item.quantity} {item.unit} remaining
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.pill}`}
                      >
                        {daysLabel(item.daysRemaining)}
                      </span>
                      <Badge status={item.bucket === 'EXPIRED' ? 'danger' : 'warning'}>
                        {item.statusLabel}
                      </Badge>
                      <span className="text-xs text-slate">
                        {item.valueAtRisk !== null
                          ? `${formatCurrency(item.valueAtRisk)} at risk`
                          : 'No cost recorded'}
                      </span>
                      <Link
                        href={`/products/pharmacy/batches?productId=${item.productId}`}
                        className="text-xs font-medium text-primary-700 hover:underline"
                      >
                        Open inventory record
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>

      <UnknownExpiryCard />
    </div>
  );
}

function UnknownExpiryCard() {
  const unknown = useQuery<ExpiryBatch[]>({
    queryKey: ['pharmacy', 'expiry', 'unknown'],
    meta: { silent: true },
    queryFn: () => apiFetch<ExpiryBatch[]>('/pharmacy/expiry/unknown'),
  });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Unknown expiry</h2>
        <Badge status="neutral">{unknown.data?.length ?? 0}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate">
        Batches recorded without an expiry date. They cannot be monitored for expiry, so add the date
        where possible.
      </p>

      {unknown.isLoading ? (
        <SectionLoader label="Loading batches without expiry…" />
      ) : null}

      {unknown.error ? (
        <div className="mt-4">
          <p className="text-sm text-danger">
            {unknown.error instanceof Error ? unknown.error.message : 'Unable to load expiry data.'}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => unknown.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {unknown.data && unknown.data.length === 0 ? (
        <p className="mt-4 text-sm text-slate">Every batch has an expiry date.</p>
      ) : null}

      {unknown.data && unknown.data.length > 0 ? (
        <div className="mt-4 space-y-2">
          {unknown.data.map((batch) => (
            <div
              key={batch.batchId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{batch.medicineName}</p>
                <p className="text-xs text-slate">Batch {batch.batchNumber ?? '—'} · no expiry</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-ink">{batch.quantity}</p>
                <p className="text-xs text-slate">
                  {batch.estimatedValue !== null
                    ? `Est. value ${formatCurrency(batch.estimatedValue)}`
                    : 'No value recorded'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
