'use client';

import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Batch } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function Batches() {
  const batches = useQuery<Batch[]>({
    queryKey: ['pharmacy', 'batches'],
    queryFn: () => apiFetch<Batch[]>('/pharmacy/batches?limit=100'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Stock batches</h1>
        <p className="text-sm text-slate">Recorded batches and their current balances.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Package className="h-5 w-5 text-info" aria-hidden="true" />
            Batches
          </h2>
          <Badge status="neutral">{batches.data?.length ?? 0} recorded</Badge>
        </div>

        {batches.isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : null}

        {batches.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {batches.error instanceof Error ? batches.error.message : 'Unable to load batches.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => batches.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {batches.data && batches.data.length === 0 ? (
          <p className="mt-4 text-sm text-slate">
            No batches recorded yet. Create one from the dashboard or a stock receipt.
          </p>
        ) : null}

        {batches.data && batches.data.length > 0 ? (
          <div className="mt-4 space-y-2">
            {batches.data.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{batch.medicineName}</p>
                  <p className="text-xs text-slate">
                    Batch {batch.batchNumber ?? '—'} ·{' '}
                    {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'No expiry'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-ink">{batch.balanceQuantity} {batch.unit}</p>
                  <p className="text-xs text-slate">
                    {batch.unitCost !== null ? `Cost ${batch.unitCost}` : 'No cost recorded'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
