'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Movement } from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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
  const [result, setResult] = useState<Movement | null>(null);

  const option = MOVEMENT_OPTIONS.find((item) => item.value === type) ?? MOVEMENT_OPTIONS[0];
  const parsedQuantity = Number(quantity);
  const quantityValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const reasonRequired = type === 'ADJUSTMENT';

  const record = useMutation({
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
      setResult(movement);
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

      {result ? (
        <Alert tone="success" className="mt-4" title="Movement recorded">
          {result.type.replace(/_/g, ' ')} of {result.quantityDelta > 0 ? '+' : ''}
          {result.quantityDelta} {unit}. New recorded balance: {result.balanceQuantity} {unit}.
        </Alert>
      ) : null}

      {record.error ? (
        <Alert tone="danger" className="mt-4" title="Movement was not recorded">
          {record.error instanceof Error ? record.error.message : 'Please try again.'}
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-ink">Movement type</span>
          <Select
            className="mt-1"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setResult(null);
            }}
          >
            {MOVEMENT_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </label>

        {option.direction === 0 ? (
          <label className="block text-sm">
            <span className="font-medium text-ink">Direction</span>
            <Select
              className="mt-1"
              value={adjustmentDirection}
              onChange={(event) =>
                setAdjustmentDirection(event.target.value === 'increase' ? 'increase' : 'decrease')
              }
            >
              <option value="decrease">Decrease recorded stock</option>
              <option value="increase">Increase recorded stock</option>
            </Select>
          </label>
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
          {record.isPending ? 'Recording…' : 'Record movement'}
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
