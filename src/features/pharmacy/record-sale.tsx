'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Trash2, XCircle } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Sale, StockOnHand } from '@/types/api';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface CartLine {
  key: string;
  productId: string;
  name: string;
  unit: string;
  available: number;
  quantity: string;
  unitPrice: string;
  discount: string;
}

interface SaleListResponse {
  data: Sale[];
  meta: { total: number; limit: number; offset: number };
}

function randomKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysUntil(dateKey: string | null): number | null {
  if (!dateKey) return null;
  const target = Date.parse(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(target)) return null;
  const today = new Date();
  const todayKey = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - todayKey) / 86_400_000);
}

/**
 * Records a sale and records stock out of the shelf.
 *
 * The cart is priced from the batch the server will pick first, but the server
 * is always the final authority: it allocates batches first-expiry-first-out,
 * refuses expired stock and refuses to go negative. A per-sale idempotency key
 * is reused across retries so a double click cannot deduct stock twice.
 */
export function RecordSale() {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canVoid = role === 'OWNER' || role === 'MANAGER';
  const canReturn = canVoid || role === 'INVENTORY_STAFF';

  const [lines, setLines] = useState<CartLine[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => randomKey('sale'));
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [returnFor, setReturnFor] = useState<string | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [returnReason, setReturnReason] = useState('');

  const stock = useQuery<StockOnHand[]>({
    queryKey: ['pharmacy', 'inventory', 'stock'],
    queryFn: () => apiFetch<StockOnHand[]>('/pharmacy/inventory/stock?limit=200'),
  });

  const sales = useQuery<SaleListResponse>({
    queryKey: ['pharmacy', 'sales', 'recent'],
    queryFn: () => apiFetch<SaleListResponse>('/pharmacy/sales?limit=20'),
  });

  const stockById = useMemo(
    () => new Map((stock.data ?? []).map((item) => [item.productId, item])),
    [stock.data],
  );

  const addProduct = (productId: string) => {
    const item = stockById.get(productId);
    if (!item) return;
    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) {
        const next = Math.min(toNumber(existing.quantity) + 1, item.sellableQuantity);
        return current.map((line) =>
          line.key === existing.key ? { ...line, quantity: String(next) } : line,
        );
      }
      return [
        ...current,
        {
          key: randomKey('line'),
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          available: item.sellableQuantity,
          quantity: '1',
          unitPrice: item.sellingPrice !== null ? String(item.sellingPrice) : '',
          discount: '',
        },
      ];
    });
    setSelectedProduct('');
  };

  const updateLine = (key: string, patch: Partial<CartLine>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: string) => {
    setLines((current) => current.filter((line) => line.key !== key));
  };

  const lineErrors = useMemo(() => {
    const map = new Map<string, string>();
    for (const line of lines) {
      const quantity = toNumber(line.quantity);
      if (quantity <= 0) {
        map.set(line.key, 'Enter a quantity greater than zero.');
      } else if (quantity > line.available) {
        map.set(line.key, `Only ${line.available} ${line.unit} can be sold.`);
      } else if (line.unitPrice.trim() && toNumber(line.unitPrice) <= 0) {
        map.set(line.key, 'Enter a price greater than zero, or leave it blank.');
      } else if (line.discount.trim() && toNumber(line.discount) < 0) {
        map.set(line.key, 'A discount cannot be negative.');
      }
    }
    return map;
  }, [lines]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let discountTotal = 0;
    let units = 0;
    for (const line of lines) {
      const quantity = toNumber(line.quantity);
      const price = toNumber(line.unitPrice);
      subtotal += quantity * price;
      discountTotal += toNumber(line.discount);
      units += quantity;
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      total: Math.round((subtotal - discountTotal) * 100) / 100,
      units: Math.round(units * 1000) / 1000,
    };
  }, [lines]);

  const canSubmit = lines.length > 0 && lineErrors.size === 0;

  const createSale = useMutation({
    mutationFn: async () => {
      const payload = {
        idempotencyKey,
        ...(customerName.trim() ? { customerName: customerName.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: toNumber(line.quantity),
          ...(line.unitPrice.trim() ? { unitPrice: toNumber(line.unitPrice) } : {}),
          ...(line.discount.trim() ? { discount: toNumber(line.discount) } : {}),
        })),
      };
      return apiFetch<Sale>('/pharmacy/sales', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (sale) => {
      setLastSale(sale);
      setLines([]);
      setCustomerName('');
      setNote('');
      setIdempotencyKey(randomKey('sale'));
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    },
  });

  const voidSale = useMutation({
    mutationFn: (saleId: string) =>
      apiFetch<Sale>(`/pharmacy/sales/${saleId}/void`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      setReturnFor(null);
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    },
  });

  const recordReturn = useMutation({
    mutationFn: (sale: Sale) => {
      const items = sale.lines
        .map((line) => ({ saleLineId: line.id, quantity: toNumber(returnQuantities[line.id] ?? '') }))
        .filter((item) => item.quantity > 0);
      return apiFetch<Sale>(`/pharmacy/sales/${sale.id}/returns`, {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: randomKey('return'),
          ...(returnReason.trim() ? { reason: returnReason.trim() } : {}),
          items,
        }),
      });
    },
    onSuccess: () => {
      setReturnFor(null);
      setReturnQuantities({});
      setReturnReason('');
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    },
  });

  const openReturn = (sale: Sale) => {
    setReturnFor(sale.id);
    setReturnQuantities({});
    setReturnReason('');
  };

  const returnable = (line: Sale['lines'][number]) =>
    Math.max(0, line.quantity - line.returnedQuantity);

  const returnCount = Object.values(returnQuantities).reduce(
    (total, value) => total + toNumber(value),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Record sale</h1>
        <p className="text-sm text-slate">
          Stock leaves the earliest expiring batch first. Expired batches are never sold, and a sale
          that cannot be covered by unexpired stock is refused.
        </p>
      </div>

      {lastSale ? (
        <Alert tone="success" title={`Sale ${lastSale.reference} recorded`}>
          <p>
            {lastSale.unitCount} unit(s) for {formatCurrency(lastSale.revenue)}.
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {lastSale.lines.map((line) => (
              <li key={line.id}>
                {line.medicineName} · batch {line.batchNumber ?? '—'} · {line.quantity} ×{' '}
                {formatCurrency(line.unitPrice)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {createSale.error ? (
        <Alert tone="danger" title="The sale was not recorded">
          {createSale.error instanceof Error
            ? createSale.error.message
            : 'Please review the sale and try again.'}
        </Alert>
      ) : null}

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[16rem] flex-1 text-xs">
            <span className="mb-1 block font-medium text-ink">Add a medicine</span>
            <Select
              value={selectedProduct}
              onChange={(event) => {
                setSelectedProduct(event.target.value);
                if (event.target.value) addProduct(event.target.value);
              }}
              aria-label="Add a medicine to the sale"
            >
              <option value="">Select a medicine with stock</option>
              {(stock.data ?? [])
                .filter((item) => item.sellableQuantity > 0)
                .map((item) => (
                  <option key={item.productId} value={item.productId}>
                    {item.name} · {item.sellableQuantity} {item.unit} available
                  </option>
                ))}
            </Select>
          </label>
          <Button
            variant="outline"
            onClick={() => selectedProduct && addProduct(selectedProduct)}
            disabled={!selectedProduct || createSale.isPending}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </div>

        {stock.isLoading ? <p className="mt-3 text-xs text-slate">Loading stock…</p> : null}
        {stock.error ? (
          <p className="mt-3 text-xs text-danger">
            {stock.error instanceof Error ? stock.error.message : 'Unable to load stock.'}
          </p>
        ) : null}
        {!stock.isLoading && !stock.error && (stock.data ?? []).every((item) => item.sellableQuantity <= 0) ? (
          <p className="mt-3 text-xs text-slate">
            No unexpired stock is available to sell yet. Record a stock receipt or add medicines
            first.
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {lines.map((line) => {
            const error = lineErrors.get(line.key);
            const expiryDays = daysUntil(stockById.get(line.productId)?.nearestExpiryDate ?? null);
            const lineTotal = Math.max(
              toNumber(line.quantity) * toNumber(line.unitPrice) - toNumber(line.discount),
              0,
            );
            return (
              <div
                key={line.key}
                className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[2fr_repeat(3,1fr)_auto]"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{line.name}</p>
                  <p className="text-xs text-slate">
                    {line.available} {line.unit} sellable
                    {expiryDays !== null
                      ? ` · earliest expiry ${expiryDays < 0 ? 'already expired' : `${expiryDays} day(s)`}`
                      : ' · no expiry recorded'}
                  </p>
                  {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
                </div>
                <label className="text-xs">
                  <span className="mb-1 block text-slate">Quantity</span>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={line.quantity}
                    aria-invalid={error ? true : undefined}
                    onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-slate">Unit price</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    placeholder="Batch price"
                    onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-slate">Discount</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.discount}
                    placeholder="0"
                    onChange={(event) => updateLine(line.key, { discount: event.target.value })}
                  />
                </label>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{formatCurrency(lineTotal)}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(line.key)}
                    aria-label={`Remove ${line.name} from the sale`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs">
            <span className="mb-1 block font-medium text-ink">Customer name (optional)</span>
            <Input
              value={customerName}
              maxLength={120}
              placeholder="Walk-in customer"
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-ink">Note (optional)</span>
            <Input
              value={note}
              maxLength={500}
              placeholder="Anything worth remembering about this sale"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate">
            {totals.units} unit(s) · subtotal {formatCurrency(totals.subtotal)} · discounts{' '}
            {formatCurrency(totals.discountTotal)}
            <p className="text-base font-semibold text-ink">
              Total {formatCurrency(totals.total)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLines([]);
                setCustomerName('');
                setNote('');
                setIdempotencyKey(randomKey('sale'));
              }}
              disabled={createSale.isPending || lines.length === 0}
            >
              Clear
            </Button>
            <Button onClick={() => createSale.mutate()} disabled={!canSubmit || createSale.isPending}>
              {createSale.isPending ? 'Recording…' : 'Record sale'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Recent sales</h2>
          {sales.data ? <p className="text-xs text-slate">{sales.data.meta.total} recorded</p> : null}
        </div>

        {sales.isLoading ? <p className="mt-3 text-xs text-slate">Loading sales…</p> : null}
        {sales.error ? (
          <p className="mt-3 text-xs text-danger">
            {sales.error instanceof Error ? sales.error.message : 'Unable to load sales.'}
          </p>
        ) : null}
        {sales.data && sales.data.data.length === 0 ? (
          <p className="mt-3 text-xs text-slate">No sales recorded yet.</p>
        ) : null}

        <ul className="mt-3 space-y-2">
          {(sales.data?.data ?? []).map((sale) => (
            <li key={sale.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {sale.reference}
                    <span className="ml-2 text-xs text-slate">{formatDateTime(sale.occurredAt)}</span>
                  </p>
                  <p className="text-xs text-slate">
                    {sale.unitCount} unit(s) · revenue {formatCurrency(sale.revenue)}
                    {sale.refundTotal > 0 ? ` · refunds ${formatCurrency(sale.refundTotal)}` : ''}
                    {sale.customerName ? ` · ${sale.customerName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={sale.status === 'VOIDED' ? 'neutral' : 'success'}>
                    {sale.status === 'VOIDED' ? 'Voided' : 'Completed'}
                  </Badge>
                  {canReturn && sale.status === 'COMPLETED' ? (
                    <Button variant="outline" size="sm" onClick={() => openReturn(sale)}>
                      <RotateCcw className="mr-1 h-3 w-3" aria-hidden="true" />
                      Return
                    </Button>
                  ) : null}
                  {canVoid && sale.status === 'COMPLETED' && sale.refundTotal === 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={voidSale.isPending}
                      onClick={() => {
                        if (window.confirm(`Void ${sale.reference}? Stock returns to the shelf.`)) {
                          voidSale.mutate(sale.id);
                        }
                      }}
                    >
                      <XCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                      Void
                    </Button>
                  ) : null}
                </div>
              </div>

              <ul className="mt-2 space-y-1 text-xs text-slate">
                {sale.lines.map((line) => (
                  <li key={line.id}>
                    {line.medicineName} · batch {line.batchNumber ?? '—'} · {line.quantity} ×{' '}
                    {formatCurrency(line.unitPrice)}
                    {line.returnedQuantity > 0 ? ` · ${line.returnedQuantity} returned` : ''}
                  </li>
                ))}
              </ul>

              {returnFor === sale.id ? (
                <div className="mt-3 rounded-md border border-border bg-slate-50 p-3">
                  <p className="text-xs font-medium text-ink">Record a customer return</p>
                  <div className="mt-2 space-y-2">
                    {sale.lines
                      .filter((line) => returnable(line) > 0)
                      .map((line) => (
                        <div key={line.id} className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                          <p className="text-xs text-slate">
                            {line.medicineName} · batch {line.batchNumber ?? '—'} · {returnable(line)}{' '}
                            returnable
                          </p>
                          <Input
                            type="number"
                            min={0}
                            max={returnable(line)}
                            step="any"
                            placeholder="0"
                            value={returnQuantities[line.id] ?? ''}
                            aria-label={`Quantity to return for ${line.medicineName}`}
                            onChange={(event) =>
                              setReturnQuantities((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}
                  </div>
                  <label className="mt-2 block text-xs">
                    <span className="mb-1 block text-slate">Reason</span>
                    <Input
                      value={returnReason}
                      maxLength={255}
                      placeholder="Damaged pack, wrong medicine…"
                      onChange={(event) => setReturnReason(event.target.value)}
                    />
                  </label>
                  {recordReturn.error ? (
                    <p className="mt-2 text-xs text-danger">
                      {recordReturn.error instanceof Error
                        ? recordReturn.error.message
                        : 'Unable to record the return.'}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={returnCount <= 0 || recordReturn.isPending}
                      onClick={() => recordReturn.mutate(sale)}
                    >
                      {recordReturn.isPending ? 'Saving…' : 'Confirm return'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setReturnFor(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-xs text-slate">
        Voiding reverses every stock movement the sale created. A sale with refunds recorded against
        it cannot be voided; record the remaining return instead. Revenue, refunds and profit are
        reported separately in the daily summary.
      </p>
    </div>
  );
}
