'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Send, Trash2 } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Medicine, StockReceipt, StockReceiptLine } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ReceiptLineDraft {
  key: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCost: number | null;
}

const emptyLine = (): ReceiptLineDraft => ({
  key: Math.random().toString(36).slice(2),
  productId: '',
  batchNumber: '',
  expiryDate: '',
  quantity: 0,
  unitCost: null,
});

export function StockReceipts() {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<ReceiptLineDraft[]>([emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<StockReceipt | null>(null);

  const medicines = useQuery<Medicine[]>({
    queryKey: ['pharmacy', 'medicines'],
    queryFn: () => apiFetch<Medicine[]>('/pharmacy/medicines?limit=100'),
  });

  const createReceipt = useMutation({
    mutationFn: async () => {
      const body = {
        externalReference: 'Received via stock receipts',
        lines: lines
          .filter((line) => line.productId && line.quantity > 0)
          .map((line) => ({
            productId: line.productId,
            batchNumber: line.batchNumber || undefined,
            expiryDate: line.expiryDate || undefined,
            quantity: line.quantity,
            unitCost: line.unitCost ?? undefined,
          })),
      };
      return apiFetch<StockReceipt>('/pharmacy/receipts', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccess: (created) => {
      setReceipt(created);
      setError(null);
    },
    onError: (err: Error) => setError(err.message || 'Unable to create receipt'),
  });

  const confirmReceipt = useMutation({
    mutationFn: async () => {
      if (!receipt) return null;
      return apiFetch<StockReceipt>(`/pharmacy/receipts/${receipt.id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: (confirmed) => {
      if (confirmed) setReceipt(confirmed);
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'dashboard'] });
    },
  });

  const updateLine = (key: string, patch: Partial<ReceiptLineDraft>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.key !== key) : prev));

  const canCreate = lines.some((line) => line.productId && line.quantity > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Stock receipts</h1>
        <p className="text-sm text-slate">
          Record incoming stock and confirm to create batches and movements.
        </p>
      </div>

      {error ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Unable to complete the receipt</h2>
          <p className="mt-2 text-sm text-slate">{error}</p>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">New receipt</h2>
        <p className="mt-1 text-sm text-slate">Add one line per received batch.</p>

        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.key} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-6">
              <select
                value={line.productId}
                onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                className="col-span-2 h-9 rounded-md border border-border bg-white px-2 text-sm text-ink"
                aria-label="Medicine"
              >
                <option value="">Select medicine</option>
                {(medicines.data ?? []).map((medicine) => (
                  <option key={medicine.id} value={medicine.id}>
                    {medicine.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={line.batchNumber}
                onChange={(e) => updateLine(line.key, { batchNumber: e.target.value })}
                placeholder="Batch number"
                className="h-9 rounded-md border border-border bg-white px-2 text-sm text-ink"
                aria-label="Batch number"
              />
              <input
                type="date"
                value={line.expiryDate}
                onChange={(e) => updateLine(line.key, { expiryDate: e.target.value })}
                className="h-9 rounded-md border border-border bg-white px-2 text-sm text-ink"
                aria-label="Expiry date"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
                placeholder="Quantity"
                className="h-9 rounded-md border border-border bg-white px-2 text-sm text-ink"
                aria-label="Quantity"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={line.unitCost ?? ''}
                  onChange={(e) =>
                    updateLine(line.key, { unitCost: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  placeholder="Unit cost"
                  className="h-9 w-24 rounded-md border border-border bg-white px-2 text-sm text-ink"
                  aria-label="Unit cost"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(line.key)}
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add line
          </Button>
          <Button
            onClick={() => createReceipt.mutate()}
            disabled={createReceipt.isPending || !canCreate}
          >
            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
            Create receipt
          </Button>
        </div>
      </Card>

      {receipt ? (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Receipt {receipt.id}</h2>
            <Badge status={receipt.status === 'CONFIRMED' ? 'success' : 'warning'}>
              {receipt.status}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-slate">
            Received: {new Date(receipt.receivedAt).toLocaleDateString()}
          </p>

          <div className="mt-4 space-y-2">
            {(receipt.lines ?? []).map((line: StockReceiptLine) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <p className="text-sm font-medium text-ink">
                  Batch {line.batchNumber ?? '—'} · {line.productId}
                </p>
                <p className="text-sm text-slate">Qty: {line.quantity}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button
              onClick={() => confirmReceipt.mutate()}
              disabled={confirmReceipt.isPending || receipt.status !== 'DRAFT'}
            >
              <Check className="mr-2 h-4 w-4" aria-hidden="true" />
              Confirm receipt
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
