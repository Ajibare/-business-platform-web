'use client';

import { useQuery } from '@tanstack/react-query';
import { ChartNoAxesCombined } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { DashboardSummary, LowStockItem } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ReportsView() {
  const summary = useQuery<DashboardSummary>({
    queryKey: ['pharmacy', 'dashboard'],
    queryFn: () => apiFetch<DashboardSummary>('/pharmacy/reports/dashboard'),
  });

  const lowStock = useQuery<LowStockItem[]>({
    queryKey: ['pharmacy', 'low-stock'],
    queryFn: () => apiFetch<LowStockItem[]>('/pharmacy/reports/low-stock'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Reports</h1>
        <p className="text-sm text-slate">Low stock and inventory risk reports.</p>
      </div>

      {summary.isLoading ? <Skeleton className="h-24 w-full" /> : null}

      {summary.data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm font-medium text-slate">Low stock</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{summary.data.lowStock}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-slate">Near expiry</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{summary.data.nearExpiry}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-slate">Expired</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{summary.data.expired}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-medium text-slate">Unknown expiry</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{summary.data.unknownExpiry}</p>
          </Card>
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ChartNoAxesCombined className="h-5 w-5 text-info" aria-hidden="true" />
            Low stock
          </h2>
          <Badge status="neutral">{lowStock.data?.length ?? 0} items</Badge>
        </div>

        {lowStock.isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : null}

        {lowStock.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {lowStock.error instanceof Error ? lowStock.error.message : 'Unable to load low stock report.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => lowStock.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {lowStock.data && lowStock.data.length === 0 ? (
          <p className="mt-4 text-sm text-slate">
            All medicines are at or above their reorder threshold.
          </p>
        ) : null}

        {lowStock.data && lowStock.data.length > 0 ? (
          <div className="mt-4 space-y-2">
            {lowStock.data.map((item) => (
              <div
                key={item.medicineId}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <p className="text-sm font-medium text-ink">{item.name}</p>
                <p className="text-sm text-slate">
                  {item.totalRecordedQuantity} {item.unit} (min {item.reorderThreshold})
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
