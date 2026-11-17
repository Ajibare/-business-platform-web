'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, Receipt, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionLoader } from '@/components/ui/loading';
import { useAuth } from '@/hooks/use-auth';
import { branchInventoryApi } from '@/services/platform';
import type { Batch, LowStockItem, Sale } from '@/types/api';
import { cn } from '@/lib/utils';

type Tab = 'inventory' | 'expiry' | 'sales';

interface BranchOperationsProps {
  branchId: string;
  branchName: string;
}

/**
 * The branch's own stock, expiry and sales.
 *
 * Every request names the branch explicitly, so this panel always shows one
 * branch even when the switcher is set to a consolidated view elsewhere.
 */
export function BranchOperations({ branchId, branchName }: BranchOperationsProps) {
  const { profile } = useAuth();
  const currency = profile?.organisation.currency ?? 'NGN';
  const [tab, setTab] = useState<Tab>('inventory');

  const batches = useQuery<Batch[]>({
    queryKey: ['branch', branchId, 'batches'],
    meta: { silent: true },
    queryFn: () => branchInventoryApi.batches(branchId),
  });

  const lowStock = useQuery<LowStockItem[]>({
    queryKey: ['branch', branchId, 'low-stock'],
    meta: { silent: true },
    queryFn: () => branchInventoryApi.lowStock(branchId),
  });

  const sales = useQuery<Sale[]>({
    queryKey: ['branch', branchId, 'sales'],
    meta: { silent: true },
    queryFn: () => branchInventoryApi.sales(branchId, 25),
  });

  const totals = useMemo(() => {
    const rows = batches.data ?? [];
    const units = rows.reduce((sum, batch) => sum + batch.balanceQuantity, 0);
    const value = rows.reduce(
      (sum, batch) => sum + (batch.unitCost !== null ? batch.unitCost * batch.balanceQuantity : 0),
      0,
    );
    const now = Date.now();
    const soon = now + 30 * 24 * 60 * 60 * 1000;
    const nearExpiry = rows.filter((batch) => {
      if (!batch.expiryDate) return false;
      const time = new Date(batch.expiryDate).getTime();
      return time >= now && time <= soon;
    }).length;
    const expired = rows.filter(
      (batch) => batch.expiryDate && new Date(batch.expiryDate).getTime() < now,
    ).length;
    return { units, value, nearExpiry, expired };
  }, [batches.data]);

  const tabs: { key: Tab; label: string; icon: typeof Warehouse }[] = [
    { key: 'inventory', label: 'Inventory', icon: Warehouse },
    { key: 'expiry', label: 'Expiry', icon: CalendarClock },
    { key: 'sales', label: 'Sales', icon: Receipt },
  ];

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Branch operations</h2>
          <p className="text-sm text-slate">Stock, expiry and sales recorded at {branchName}.</p>
        </div>
        <Badge status="neutral">{batches.data?.length ?? 0} batches</Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium text-slate">Units on hand</p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatNumber(totals.units)}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium text-slate">Stock value (cost)</p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatMoney(totals.value, currency)}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium text-slate">Near expiry (30 days)</p>
          <p className="mt-1 text-xl font-semibold text-warning">{totals.nearExpiry}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs font-medium text-slate">Expired batches</p>
          <p className="mt-1 text-xl font-semibold text-danger">{totals.expired}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-1 border-b border-border">
        {tabs.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.key}
              type="button"
              aria-pressed={tab === entry.key}
              onClick={() => setTab(entry.key)}
              className={cn(
                '-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium',
                tab === entry.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate hover:text-ink',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {entry.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {tab === 'inventory' ? (
          <InventoryPanel batches={batches} lowStock={lowStock} currency={currency} />
        ) : null}
        {tab === 'expiry' ? <ExpiryPanel batches={batches} currency={currency} /> : null}
        {tab === 'sales' ? <SalesPanel sales={sales} currency={currency} /> : null}
      </div>
    </Card>
  );
}

function InventoryPanel({
  batches,
  lowStock,
  currency,
}: {
  batches: UseQueryResult<Batch[]>;
  lowStock: UseQueryResult<LowStockItem[]>;
  currency: string;
}) {
  if (batches.isLoading) return <SectionLoader label="Loading branch stock…" />;
  if (batches.error) {
    return <ErrorLine message="Unable to load this branch's stock." onRetry={() => batches.refetch()} />;
  }
  if (!batches.data || batches.data.length === 0) {
    return (
      <EmptyState
        title="No stock recorded at this branch"
        description="Receive stock at this branch, or transfer some from another branch, and it will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate">
            <tr>
              <th className="py-2">Medicine</th>
              <th className="py-2">Batch</th>
              <th className="py-2">Expiry</th>
              <th className="py-2 text-right">Quantity</th>
              <th className="py-2 text-right">Unit cost</th>
              <th className="py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {batches.data.map((batch) => (
              <tr key={batch.id}>
                <td className="py-2 pr-3 font-medium text-ink">{batch.medicineName}</td>
                <td className="py-2 pr-3 text-slate">{batch.batchNumber ?? '—'}</td>
                <td className="py-2 pr-3 text-slate">{formatDate(batch.expiryDate)}</td>
                <td className="py-2 text-right text-ink">
                  {formatNumber(batch.balanceQuantity)} {batch.unit}
                </td>
                <td className="py-2 text-right text-slate">
                  {batch.unitCost !== null ? formatMoney(batch.unitCost, currency) : '—'}
                </td>
                <td className="py-2 text-right text-ink">
                  {batch.unitCost !== null
                    ? formatMoney(batch.unitCost * batch.balanceQuantity, currency)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
          Low stock at this branch
        </h3>
        {lowStock.isLoading ? <SectionLoader label="Loading low stock…" className="py-3" /> : null}
        {lowStock.data && lowStock.data.length === 0 ? (
          <p className="mt-2 text-sm text-slate">Every medicine is above its reorder level.</p>
        ) : null}
        {lowStock.data && lowStock.data.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {lowStock.data.map((item) => (
              <li key={item.medicineId} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">{item.name}</span>
                <span className="text-slate">
                  {formatNumber(item.totalRecordedQuantity)} {item.unit} · reorder at{' '}
                  {formatNumber(item.reorderThreshold)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function ExpiryPanel({
  batches,
  currency,
}: {
  batches: UseQueryResult<Batch[]>;
  currency: string;
}) {
  if (batches.isLoading) return <SectionLoader label="Loading branch expiry records…" />;
  if (batches.error) {
    return <ErrorLine message="Unable to load expiry records." onRetry={() => batches.refetch()} />;
  }

  const rows = (batches.data ?? [])
    .filter((batch) => batch.expiryDate)
    .sort((left, right) => (left.expiryDate ?? '').localeCompare(right.expiryDate ?? ''));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No expiry dates recorded"
        description="Batches without an expiry date are excluded from expiry reporting."
      />
    );
  }

  const now = Date.now();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate">
          <tr>
            <th className="py-2">Medicine</th>
            <th className="py-2">Batch</th>
            <th className="py-2">Expiry</th>
            <th className="py-2">Status</th>
            <th className="py-2 text-right">Quantity</th>
            <th className="py-2 text-right">Value at risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((batch) => {
            const time = new Date(batch.expiryDate as string).getTime();
            const days = Math.ceil((time - now) / (24 * 60 * 60 * 1000));
            const status = days < 0 ? 'danger' : days <= 30 ? 'warning' : days <= 90 ? 'info' : 'neutral';
            const label = days < 0 ? 'Expired' : days <= 30 ? `${days} days` : days <= 90 ? `${days} days` : 'OK';
            return (
              <tr key={batch.id}>
                <td className="py-2 pr-3 font-medium text-ink">{batch.medicineName}</td>
                <td className="py-2 pr-3 text-slate">{batch.batchNumber ?? '—'}</td>
                <td className="py-2 pr-3 text-slate">{formatDate(batch.expiryDate)}</td>
                <td className="py-2 pr-3">
                  <Badge status={status}>{label}</Badge>
                </td>
                <td className="py-2 text-right text-ink">
                  {formatNumber(batch.balanceQuantity)} {batch.unit}
                </td>
                <td className="py-2 text-right text-ink">
                  {batch.unitCost !== null
                    ? formatMoney(batch.unitCost * batch.balanceQuantity, currency)
                    : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SalesPanel({
  sales,
  currency,
}: {
  sales: UseQueryResult<Sale[]>;
  currency: string;
}) {
  if (sales.isLoading) return <SectionLoader label="Loading branch sales…" />;
  if (sales.error) {
    return <ErrorLine message="Unable to load branch sales." onRetry={() => sales.refetch()} />;
  }
  if (!sales.data || sales.data.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No sales recorded at this branch yet"
        description="Sales recorded while working in this branch appear here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-slate">
          <tr>
            <th className="py-2">Reference</th>
            <th className="py-2">When</th>
            <th className="py-2">Status</th>
            <th className="py-2 text-right">Items</th>
            <th className="py-2 text-right">Net sales</th>
            <th className="py-2 text-right">Profit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.data.map((sale) => (
            <tr key={sale.id}>
              <td className="py-2 pr-3 font-medium text-ink">{sale.reference}</td>
              <td className="py-2 pr-3 text-slate">{new Date(sale.occurredAt).toLocaleString()}</td>
              <td className="py-2 pr-3">
                <Badge status={sale.status === 'COMPLETED' ? 'success' : 'neutral'}>
                  {sale.status === 'COMPLETED' ? 'Completed' : 'Voided'}
                </Badge>
              </td>
              <td className="py-2 text-right text-slate">{sale.unitCount}</td>
              <td className="py-2 text-right text-ink">{formatMoney(sale.netSales, currency)}</td>
              <td className="py-2 text-right text-slate">
                {sale.grossProfit !== null ? formatMoney(sale.grossProfit, currency) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ErrorLine({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div>
      <p className="text-sm text-danger">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 rounded-md border border-border px-3 py-1 text-xs font-medium text-ink hover:bg-background"
      >
        Retry
      </button>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}
