'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { ExpiryBatch } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ExpirySection {
  key: string;
  label: string;
  description: string;
  status: 'success' | 'warning' | 'danger' | 'neutral';
  queryKey: string[];
  path: string;
}

const sections: ExpirySection[] = [
  {
    key: 'near',
    label: 'Near expiry',
    description: 'Batches expiring within the warning window (30 days).',
    status: 'warning',
    queryKey: ['pharmacy', 'expiry', 'near'],
    path: '/pharmacy/expiry/near?days=30',
  },
  {
    key: 'expired',
    label: 'Expired',
    description: 'Batches past their expiry date.',
    status: 'danger',
    queryKey: ['pharmacy', 'expiry', 'expired'],
    path: '/pharmacy/expiry/expired',
  },
  {
    key: 'unknown',
    label: 'Unknown expiry',
    description: 'Batches recorded without an expiry date.',
    status: 'neutral',
    queryKey: ['pharmacy', 'expiry', 'unknown'],
    path: '/pharmacy/expiry/unknown',
  },
];

function ExpiryRow({ batch }: { batch: ExpiryBatch }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium text-ink">{batch.medicineName}</p>
        <p className="text-xs text-slate">
          Batch {batch.batchNumber ?? '—'} ·{' '}
          {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'No expiry'}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-ink">{batch.quantity}</p>
        <p className="text-xs text-slate">
          {batch.estimatedValue !== null ? `Est. value ${batch.estimatedValue}` : 'No value recorded'}
        </p>
      </div>
    </div>
  );
}

export function ExpiryMonitor() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Expiry monitoring</h1>
        <p className="text-sm text-slate">
          Batches by expiry risk. Quantities are recorded balances, not physically verified.
        </p>
      </div>

      {sections.map((section) => (
        <ExpiryCard key={section.key} section={section} />
      ))}
    </div>
  );
}

function ExpiryCard({ section }: { section: ExpirySection }) {
  const query = useQuery<ExpiryBatch[]>({
    queryKey: section.queryKey,
    queryFn: () => apiFetch<ExpiryBatch[]>(section.path),
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <CalendarClock className="h-5 w-5 text-info" aria-hidden="true" />
          {section.label}
        </h2>
        <Badge status={section.status}>{query.data?.length ?? 0}</Badge>
      </div>
      <p className="mt-1 text-sm text-slate">{section.description}</p>

      {query.isLoading ? (
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : null}

      {query.error ? (
        <div className="mt-4">
          <p className="text-sm text-danger">
            {query.error instanceof Error ? query.error.message : 'Unable to load expiry data.'}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {query.data && query.data.length === 0 ? (
        <p className="mt-4 text-sm text-slate">Nothing to show here.</p>
      ) : null}

      {query.data && query.data.length > 0 ? (
        <div className="mt-4 space-y-2">
          {query.data.map((batch) => (
            <ExpiryRow key={batch.batchId} batch={batch} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
