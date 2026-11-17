'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Movement } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InlineLoader } from '@/components/ui/loading';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/toast';

type MovementOption = {
  value: string;
  label: string;
  direction: 1 | -1 | 0;
};

const MOVEMENT_OPTIONS: MovementOption[] = [
  { value: 'ISSUE', label: 'Stock out (issue)', direction: -1 },
  { value: 'CUSTOMER_RETURN', label: 'Customer return', direction: 1 },
  { value: 'SUPPLIER_RETURN', label: 'Return to supplier', direction: -1 },
  { value: 'DAMAGE', label: 'Damage', direction: -1 },
  { value: 'EXPIRED', label: 'Expired stock disposal', direction: -1 },
  { value: 'ADJUSTMENT', label: 'Adjustment (increase or decrease)', direction: 0 },
];

export interface MovementFormProps {
  batchId: string;
  batchLabel: string;
  unit: string;
  onRecorded?: (movement: Movement) => void;
  onCancel?: () => void;
}

/**
 * Records a stock movement for a single batch. This is the only way stock is
 * changed from a scanned product: the movement is validated server side,
 * idempotent and visible in the ledger.
 */
export function MovementForm({
  batchId,
  batchLabel,
  unit,
  onRecorded,
  onCancel,
}: MovementFormProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('ISSUE');
  const [quantity, setQuantity] = useState('');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'increase' | 'decrease'>('decrease');
  const [reason, setReason] = useState('');

  const option = MOVEMENT_OPTIONS.find((item) => item.value === type) ?? MOVEMENT_OPTIONS[0];
  const parsedQuantity = Number(quantity);
  const quantityValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const reasonRequired = type === 'ADJUSTMENT';

  const record = useMutation({
    meta: { errorMessage: 'The movement was not recorded. Please try again.' },
    mutationFn: () => {
      const direction =
        option.direction === 0 ? (adjustmentDirection === 'increase' ? 1 : -1) : option.direction;
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? `scan-movement-${batchId}-${crypto.randomUUID()}`
          : `scan-movement-${batchId}-${Date.now()}`;

      return apiFetch<Movement>('/pharmacy/movements', {
        method: 'POST',
        body: JSON.stringify({
          batchId,
          type,
          quantityDelta: direction * Math.abs(parsedQuantity),
          reason: reason.trim() || undefined,
          idempotencyKey,
        }),
      });
    },
    onSuccess: (movement) => {
      // The confirmation belongs in the popup: the balance is the one number
      // the user needs after a movement.
      toast.success(`${option.label}: ${movement.balanceQuantity} ${unit} in stock.`);
      setQuantity('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
      onRecorded?.(movement);
    },
  });

  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <ArrowLeftRight className="h-5 w-5 text-info" aria-hidden="true" />
        Record stock movement
      </h2>
      <p className="mt-1 text-sm text-slate">
        {batchLabel} · quantities are {unit}. Every movement is recorded in the stock ledger.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SearchableSelect
          label="Movement type"
          value={type}
          onChange={(next) => setType(next)}
          options={MOVEMENT_OPTIONS.map((item) => ({ value: item.value, label: item.label }))}
          searchPlaceholder="Search movement types…"
        />

        {option.direction === 0 ? (
          <SearchableSelect
            label="Direction"
            value={adjustmentDirection}
            onChange={(next) => setAdjustmentDirection(next === 'increase' ? 'increase' : 'decrease')}
            options={[
              { value: 'decrease', label: 'Decrease recorded stock' },
              { value: 'increase', label: 'Increase recorded stock' },
            ]}
            searchPlaceholder="Search directions…"
          />
        ) : null}

        <label className="block text-sm">
          <span className="font-medium text-ink">Quantity ({unit})</span>
          <Input
            className="mt-1"
            type="number"
            min={0}
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="0"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-ink">
            Reason {reasonRequired ? '(required for adjustments)' : '(optional)'}
          </span>
          <Input
            className="mt-1"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: dispensed to patient, damaged pack"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => record.mutate()}
          disabled={record.isPending || !quantityValid || (reasonRequired && !reason.trim())}
        >
          {record.isPending ? <InlineLoader label="Recording…" /> : 'Record movement'}
        </Button>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={record.isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
