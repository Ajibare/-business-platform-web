'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Package, X } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Batch } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function Batches() {
  const searchParams = useSearchParams();
  // Set by the expiry alerts so "open inventory record" lands on that medicine.
  const productId = searchParams.get('productId') ?? '';

  const batches = useQuery<Batch[]>({
    queryKey: ['pharmacy', 'batches', productId],
    queryFn: () =>
      apiFetch<Batch[]>(
        `/pharmacy/batches?limit=100${productId ? `&medicineId=${encodeURIComponent(productId)}` : ''}`,
      ),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Stock batches</h1>
        <p className="text-sm text-slate">Recorded batches and their current balances.</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Package className="h-5 w-5 text-info" aria-hidden="true" />
            Batches
          </h2>
          <div className="flex items-center gap-2">
            {productId ? (
              <Link
                href="/products/pharmacy/batches"
                className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-ink hover:bg-background"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Clear medicine filter
              </Link>
            ) : null}
            <Badge status="neutral">{batches.data?.length ?? 0} recorded</Badge>
          </div>
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
            {productId
              ? 'This medicine has no batches recorded yet.'
              : 'No batches recorded yet. Create one from the dashboard or a stock receipt.'}
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
                  <p className="text-sm font-medium text-ink">
                    {batch.balanceQuantity} {batch.unit}
                  </p>
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
