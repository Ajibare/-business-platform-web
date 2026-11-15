'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, Clock, Coins, Package } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { DashboardSummary } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const summaryCards = [
  {
    key: 'outOfStock',
    label: 'Out of stock',
    description: 'Products with zero recorded stock.',
    status: 'danger' as const,
    icon: Package,
  },
  {
    key: 'lowStock',
    label: 'Low stock',
    description: 'Below the configured minimum level.',
    status: 'warning' as const,
    icon: AlertTriangle,
  },
  {
    key: 'nearExpiry',
    label: 'Near expiry',
    description: 'Batches expiring within the warning window.',
    status: 'warning' as const,
    icon: CalendarClock,
  },
  {
    key: 'expired',
    label: 'Expired',
    description: 'Batches past the expiry date.',
    status: 'danger' as const,
    icon: Clock,
  },
];

export function PharmacyDashboard() {
  const { data, isLoading, error, refetch } = useQuery<DashboardSummary>({
    queryKey: ['pharmacy', 'dashboard'],
    queryFn: () => apiFetch<DashboardSummary>('/pharmacy/reports/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-16" />
              <Skeleton className="mt-4 h-3 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">Unable to load the pharmacy dashboard</h2>
        <p className="mt-2 text-sm text-slate">
          {error instanceof Error ? error.message : 'The dashboard could not be loaded.'}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (data.medicines === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">No medicines recorded yet</h2>
        <p className="mt-2 text-sm text-slate">
          Add a medicine and an opening stock batch to see risk insights.
        </p>
      </Card>
    );
  }

  const valueAtRisk = data.estimatedValueAtRisk;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-warning/50 bg-warning/10 p-4 text-sm text-ink">
        Quantities are recorded balances, not physically verified.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const value = data[card.key as keyof DashboardSummary] as number;
          return (
            <Card key={card.key} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate">{card.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
                </div>
                <Badge status={card.status}>{card.label}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate">{card.description}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Coins className="h-5 w-5 text-info" aria-hidden="true" />
            Estimated value at risk
          </h2>
        </div>
        <p className="mt-2 text-3xl font-semibold text-ink">
          {valueAtRisk === null ? '—' : valueAtRisk.toLocaleString()}
        </p>
        <p className="mt-2 text-sm text-slate">
          Estimated value of near-expiry stock using recorded cost. Estimates only.
        </p>
      </Card>
    </div>
  );
}
