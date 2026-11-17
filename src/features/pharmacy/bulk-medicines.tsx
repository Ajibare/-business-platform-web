'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/services/api';
import {
  BulkMedicineResult,
  BulkMedicineRowInput,
  Supplier,
} from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InlineLoader } from '@/components/ui/loading';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from '@/components/ui/toast';

interface RowDraft {
  id: string;
  name: string;
  genericName: string;
  brand: string;
  category: string;
  strength: string;
  dosageForm: string;
  unit: string;
  batchNumber: string;
  quantity: string;
  unitCost: string;
  sellingPrice: string;
  expiryDate: string;
  supplierId: string;
  reorderThreshold: string;
}

type RowErrors = Partial<Record<keyof RowDraft, string>>;

const TEXT_FIELDS: (keyof RowDraft)[] = [
  'name',
  'genericName',
  'brand',
  'category',
  'strength',
  'dosageForm',
  'unit',
  'batchNumber',
  'quantity',
  'unitCost',
  'sellingPrice',
  'expiryDate',
  'supplierId',
  'reorderThreshold',
];

function emptyRow(): RowDraft {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    genericName: '',
    brand: '',
    category: '',
    strength: '',
    dosageForm: '',
    unit: '',
    batchNumber: '',
    quantity: '',
    unitCost: '',
    sellingPrice: '',
    expiryDate: '',
    supplierId: '',
    reorderThreshold: '',
  };
}

function toNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isBlank(row: RowDraft): boolean {
  return TEXT_FIELDS.every((field) => row[field].trim() === '');
}

function validateRow(row: RowDraft): RowErrors {
  const errors: RowErrors = {};
  if (!row.name.trim()) errors.name = 'Medicine name is required.';
  if (!row.unit.trim()) errors.unit = 'Unit is required.';

  const quantity = row.quantity.trim();
  if (quantity && (toNumber(quantity) ?? 0) <= 0) {
    errors.quantity = 'Quantity must be greater than zero.';
  }
  if (row.unitCost.trim() && toNumber(row.unitCost) === undefined) {
    errors.unitCost = 'Enter a number.';
  }
  if (row.sellingPrice.trim() && toNumber(row.sellingPrice) === undefined) {
    errors.sellingPrice = 'Enter a number.';
  }
  if (row.reorderThreshold.trim() && toNumber(row.reorderThreshold) === undefined) {
    errors.reorderThreshold = 'Enter a number.';
  }
  if (row.expiryDate && Number.isNaN(new Date(`${row.expiryDate}T00:00:00Z`).getTime())) {
    errors.expiryDate = 'Use the YYYY-MM-DD format.';
  }
  return errors;
}

/**
 * Multi-row medicine form.
 *
 * Several rows can carry the same medicine name with different batch details,
 * which is how one medicine starts with more than one batch. The API saves each
 * row independently and reports successes and failures separately.
 */
export function BulkMedicines() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<RowDraft[]>([emptyRow()]);
  const [result, setResult] = useState<BulkMedicineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const suppliers = useQuery<Supplier[]>({
    queryKey: ['pharmacy', 'suppliers'],
    // The supplier field simply stays empty; a popup would interrupt a form that
    // can still be completed without it.
    meta: { silent: true },
    queryFn: () => apiFetch<Supplier[]>('/pharmacy/suppliers?limit=100'),
  });

  const errors = useMemo(() => {
    const map = new Map<string, RowErrors>();
    for (const row of rows) {
      map.set(row.id, isBlank(row) ? {} : validateRow(row));
    }
    return map;
  }, [rows]);

  const filledRows = rows.filter((row) => !isBlank(row));
  const invalidRows = filledRows.filter((row) => Object.keys(errors.get(row.id) ?? {}).length > 0);

  const save = useMutation({
    // The result card lists every row the API rejected, so the partial outcome is
    // announced here with the counts. A request that failed outright is announced
    // by the shared cache from `errorMessage`.
    meta: { errorMessage: 'Failed to create the medicine. Please try again.' },
    mutationFn: (payload: BulkMedicineRowInput[]) =>
      apiFetch<BulkMedicineResult>('/pharmacy/medicines/bulk', {
        method: 'POST',
        body: JSON.stringify({ rows: payload }),
      }),
    onSuccess: (saved) => {
      setResult(saved);
      setError(null);
      setSubmitAttempted(false);
      if (saved.failed > 0) {
        toast.error(
          `${saved.failed} of ${saved.rows.length} medicine(s) were not saved. Fix the rows below and save again.`,
        );
      } else {
        toast.success(
          saved.created === saved.rows.length
            ? 'Medicine(s) created successfully.'
            : 'Medicines saved successfully.',
        );
      }
      // Keep only the rows that failed so they can be corrected and resubmitted.
      const failedIndices = new Set(
        saved.rows.filter((row) => row.status === 'FAILED').map((row) => row.row - 1),
      );
      const remaining = filledRows.filter((_, index) => failedIndices.has(index));
      setRows(remaining.length > 0 ? remaining : [emptyRow()]);
      queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
    },
  });

  const dirty = filledRows.length > 0;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const update = (id: string, field: keyof RowDraft, value: string) => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => setRows((current) => [...current, emptyRow()]);

  const duplicateRow = (id: string) => {
    setRows((current) => {
      const index = current.findIndex((row) => row.id === id);
      if (index === -1) return current;
      const copy = { ...current[index], id: emptyRow().id, batchNumber: '' };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  };

  const removeRow = (id: string) => {
    setRows((current) => (current.length === 1 ? [emptyRow()] : current.filter((row) => row.id !== id)));
  };

  const submit = () => {
    setSubmitAttempted(true);
    setError(null);
    if (invalidRows.length > 0) {
      setError('Some rows still need attention. Fix the highlighted fields and save again.');
      return;
    }
    if (filledRows.length === 0) {
      setError('Add at least one medicine before saving.');
      return;
    }

    const payload: BulkMedicineRowInput[] = filledRows.map((row) => ({
      name: row.name.trim(),
      unit: row.unit.trim(),
      ...(row.genericName.trim() ? { genericName: row.genericName.trim() } : {}),
      ...(row.brand.trim() ? { brand: row.brand.trim() } : {}),
      ...(row.category.trim() ? { category: row.category.trim() } : {}),
      ...(row.strength.trim() ? { strength: row.strength.trim() } : {}),
      ...(row.dosageForm.trim() ? { dosageForm: row.dosageForm.trim() } : {}),
      ...(row.batchNumber.trim() ? { batchNumber: row.batchNumber.trim() } : {}),
      ...(row.expiryDate ? { expiryDate: row.expiryDate } : {}),
      ...(toNumber(row.quantity) !== undefined ? { quantity: toNumber(row.quantity) } : {}),
      ...(toNumber(row.unitCost) !== undefined ? { unitCost: toNumber(row.unitCost) } : {}),
      ...(toNumber(row.sellingPrice) !== undefined
        ? { sellingPrice: toNumber(row.sellingPrice) }
        : {}),
      ...(toNumber(row.reorderThreshold) !== undefined
        ? { reorderThreshold: toNumber(row.reorderThreshold) }
        : {}),
      ...(row.supplierId ? { supplierId: row.supplierId } : {}),
    }));

    save.mutate(payload);
  };

  const field = (
    row: RowDraft,
    key: keyof RowDraft,
    label: string,
    options: { type?: string; placeholder?: string; required?: boolean } = {},
  ) => {
    const rowErrors = errors.get(row.id) ?? {};
    const message = submitAttempted ? rowErrors[key] : undefined;
    return (
      <label className="block text-xs">
        <span className="mb-1 block font-medium text-ink">
          {label}
          {options.required ? <span className="text-danger"> *</span> : null}
        </span>
        <Input
          type={options.type ?? 'text'}
          value={row[key] as string}
          placeholder={options.placeholder}
          aria-invalid={message ? true : undefined}
          className={message ? 'border-danger' : undefined}
          onChange={(event) => update(row.id, key, event.target.value)}
        />
        {message ? <span className="mt-1 block text-danger">{message}</span> : null}
      </label>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Add medicines</h1>
        <p className="text-sm text-slate">
          Record several medicines, and their opening batches, in one save. Repeat a medicine name
          with a different batch number to load more than one batch for it.
        </p>
      </div>

      {result ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-ink">Last save</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge status="success">Created {result.created}</Badge>
            <Badge status="info">Batches added {result.batchesAdded}</Badge>
            <Badge status={result.failed > 0 ? 'danger' : 'neutral'}>
              Failed {result.failed}
            </Badge>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {result.rows.map((row) => (
              <li key={`${row.row}-${row.name}`} className="rounded-md border border-border p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-ink">
                    Row {row.row}: {row.name}
                  </span>
                  <Badge
                    status={
                      row.status === 'FAILED'
                        ? 'danger'
                        : row.status === 'BATCH_ADDED'
                          ? 'info'
                          : 'success'
                    }
                  >
                    {row.status === 'FAILED'
                      ? 'Not saved'
                      : row.status === 'BATCH_ADDED'
                        ? `Batch added (${row.quantity ?? 0})`
                        : 'Created'}
                  </Badge>
                </div>
                {row.errors.map((message) => (
                  <p key={message} className="mt-1 text-danger">
                    {message}
                  </p>
                ))}
                {row.warnings.map((message) => (
                  <p key={message} className="mt-1 text-warning">
                    {message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {error ? (
        <Alert tone="danger" title="Nothing was saved">
          {error}
        </Alert>
      ) : null}

      <div className="space-y-4">
        {rows.map((row, index) => {
          const rowErrors = errors.get(row.id) ?? {};
          const hasErrors = submitAttempted && Object.keys(rowErrors).length > 0;
          return (
            <Card
              key={row.id}
              className={`p-4 ${hasErrors ? 'border-danger' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-ink">
                  Medicine {index + 1}
                  {isBlank(row) ? <span className="ml-2 text-xs text-slate">(empty)</span> : null}
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateRow(row.id)}
                    aria-label={`Duplicate row ${index + 1}`}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.id)}
                    aria-label={`Remove row ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {field(row, 'name', 'Medicine name', { required: true, placeholder: 'Paracetamol 500mg' })}
                {field(row, 'genericName', 'Generic name')}
                {field(row, 'brand', 'Brand')}
                {field(row, 'category', 'Category')}
                {field(row, 'strength', 'Strength', { placeholder: '500mg' })}
                {field(row, 'dosageForm', 'Dosage form', { placeholder: 'Tablet' })}
                {field(row, 'unit', 'Unit', { required: true, placeholder: 'tablet' })}
                {field(row, 'reorderThreshold', 'Reorder level', { type: 'number' })}
                {field(row, 'batchNumber', 'Batch number')}
                {field(row, 'expiryDate', 'Expiry date', { type: 'date' })}
                {field(row, 'quantity', 'Quantity', { type: 'number' })}
                {field(row, 'unitCost', 'Purchase price', { type: 'number' })}
                {field(row, 'sellingPrice', 'Selling price', { type: 'number' })}
                <SearchableSelect
                  label="Supplier"
                  value={row.supplierId}
                  onChange={(next) => update(row.id, 'supplierId', next)}
                  options={(suppliers.data ?? []).map((supplier) => ({
                    value: supplier.id,
                    label: supplier.name,
                    description: supplier.phone ?? supplier.email ?? undefined,
                  }))}
                  placeholder="No supplier"
                  searchPlaceholder="Search suppliers…"
                  emptyMessage="No supplier matches that search. Add one on the Suppliers page."
                  loading={suppliers.isLoading}
                  clearable
                />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={addRow} disabled={save.isPending}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add another medicine
        </Button>
        <Button onClick={submit} disabled={save.isPending}>
          <PackagePlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {save.isPending ? <InlineLoader label="Saving…" /> : `Save ${filledRows.length || ''} medicine(s)`}
        </Button>
        {invalidRows.length > 0 && submitAttempted ? (
          <span className="text-xs text-danger">
            {invalidRows.length} row(s) still have errors.
          </span>
        ) : null}
      </div>

      <p className="text-xs text-slate">
        Saving keeps every row independent: a rejected row never blocks the others, and nothing is
        written until you press save. Entering a quantity creates a batch and an opening stock
        movement so the stock ledger stays complete.
      </p>
    </div>
  );
}
