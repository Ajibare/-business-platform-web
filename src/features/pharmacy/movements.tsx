'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Movement } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionLoader } from '@/components/ui/loading';

function statusFor(type: string) {
  switch (type) {
    case 'RECEIPT':
    case 'OPENING':
    case 'CUSTOMER_RETURN':
      return 'success' as const;
    case 'ADJUSTMENT':
      return 'warning' as const;
    case 'REVERSAL':
      return 'info' as const;
    default:
      return 'neutral' as const;
  }
}

export function Movements() {
  const movements = useQuery<Movement[]>({
    queryKey: ['pharmacy', 'movements'],
    // The ledger prints its own failure.
    meta: { silent: true },
    queryFn: () => apiFetch<Movement[]>('/pharmacy/movements?limit=100'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Stock movements</h1>
        <p className="text-sm text-slate">Most recent recorded movements across all batches.</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ArrowLeftRight className="h-5 w-5 text-info" aria-hidden="true" />
            Movements
          </h2>
          <Badge status="neutral">{movements.data?.length ?? 0} recorded</Badge>
        </div>

        {movements.isLoading ? <SectionLoader label="Loading movements…" /> : null}

        {movements.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {movements.error instanceof Error ? movements.error.message : 'Unable to load movements.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => movements.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {movements.data && movements.data.length === 0 ? (
          <p className="mt-4 text-sm text-slate">No movements recorded yet.</p>
        ) : null}

        {movements.data && movements.data.length > 0 ? (
          <div className="mt-4 space-y-2">
            {movements.data.map((movement) => (
              <div
                key={movement.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {movement.type.replace(/_/g, ' ')}
                    {movement.reason ? ` · ${movement.reason}` : ''}
                  </p>
                  <p className="text-xs text-slate">
                    {new Date(movement.occurredAt).toLocaleString()} · Batch {movement.batchId.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={
                      movement.quantityDelta >= 0
                        ? 'text-sm font-medium text-success'
                        : 'text-sm font-medium text-danger'
                    }
                  >
                    {movement.quantityDelta >= 0 ? '+' : ''}
                    {movement.quantityDelta}
                  </p>
                  <Badge status={statusFor(movement.type)}>{movement.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
