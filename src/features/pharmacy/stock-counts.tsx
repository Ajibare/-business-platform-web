'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { StockCount, StockCountLine } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function StockCounts() {
  const queryClient = useQueryClient();
  const [count, setCount] = useState<StockCount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const startCount = useMutation({
    mutationFn: async () => {
      const created = await apiFetch<StockCount>('/pharmacy/counts', {
        method: 'POST',
        body: JSON.stringify({ scope: 'ALL' }),
      });
      return created;
    },
    onSuccess: (created) => {
      setCount(created);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message || 'Unable to start stock count');
    },
  });

  const saveLine = useMutation({
    mutationFn: async (line: StockCountLine) => {
      if (!count) return line;
      return apiFetch<StockCountLine>(`/pharmacy/counts/${count.id}/lines`, {
        method: 'POST',
        body: JSON.stringify({
          batchId: line.batchId,
          countedQuantity: line.countedQuantity,
          note: line.note ?? undefined,
        }),
      });
    },
    onSuccess: (updated) => {
      setCount((prev) =>
        prev
          ? {
              ...prev,
              lines: prev.lines.map((l) => (l.id === updated.id ? updated : l)),
            }
          : prev,
      );
    },
  });

  const submitCount = useMutation({
    mutationFn: async () => {
      if (!count) return null;
      return apiFetch<StockCount>(`/pharmacy/counts/${count.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'dashboard'] });
    },
  });

  const approveCount = useMutation({
    mutationFn: async () => {
      if (!count) return null;
      return apiFetch<StockCount>(`/pharmacy/counts/${count.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'dashboard'] });
    },
  });

  const handleSaveLine = (line: StockCountLine) => {
    saveLine.mutate({
      ...line,
      countedQuantity: drafts[line.id] ?? line.countedQuantity,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Stock counts</h1>
          <p className="text-sm text-slate">
            Count physical stock and reconcile recorded balances through approved adjustments.
          </p>
        </div>
        <Button onClick={() => startCount.mutate()} disabled={startCount.isPending}>
          <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
          Start stock count
        </Button>
      </div>

      {error ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Unable to start stock count</h2>
          <p className="mt-2 text-sm text-slate">{error}</p>
        </Card>
      ) : null}

      {count ? (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Count {count.id}</h2>
            <Badge status={count.status === 'APPROVED' ? 'success' : 'warning'}>{count.status}</Badge>
          </div>
          <p className="mt-2 text-sm text-slate">Scope: {count.scope}</p>

          <div className="mt-4 space-y-3">
            {(count.lines ?? []).map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">Batch {line.batchId ?? '—'}</p>
                  <p className="text-xs text-slate">
                    Recorded: {line.recordedQuantity ?? 0} · Counted: {line.countedQuantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    value={drafts[line.id] ?? line.countedQuantity}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))}
                    className="h-9 w-24 rounded-md border border-border bg-white px-2 text-sm text-ink"
                    aria-label={`Counted quantity for batch ${line.batchId ?? line.id}`}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleSaveLine(line)}
                    disabled={saveLine.isPending}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2">
            <Button
              onClick={() => submitCount.mutate()}
              disabled={submitCount.isPending || count.status !== 'DRAFT'}
            >
              Submit count
            </Button>
            <Button
              onClick={() => approveCount.mutate()}
              disabled={approveCount.isPending || count.status !== 'SUBMITTED'}
            >
              Approve count
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">No stock count in progress</h2>
          <p className="mt-2 text-sm text-slate">Start a physical stock count to reconcile recorded balances.</p>
        </Card>
      )}
    </div>
  );
}
