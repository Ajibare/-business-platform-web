'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SectionLoader } from '@/components/ui/loading';
import { toast } from '@/components/ui/toast';
import { useBranch } from '@/hooks/use-branch';
import { ApiError } from '@/services/api';
import { branchApi, branchInventoryApi, transferApi } from '@/services/platform';
import type { Batch } from '@/types/api';
import type { BranchRecord } from '@/types/platform';

interface DraftLine {
  sourceBatchId: string;
  quantity: number;
}

interface TransferCreateProps {
  onCreated: () => void;
  onCancel: () => void;
}

/**
 * Builds an inter-branch transfer.
 *
 * Batches are read from the source branch, so no one can pick stock from a
 * branch they are not working in. The API re-checks quantities and branches
 * again when the request is saved and again when it is dispatched.
 */
export function TransferCreate({ onCreated, onCancel }: TransferCreateProps) {
  const { activeBranchId } = useBranch();
  const [fromBranchId, setFromBranchId] = useState(activeBranchId ?? '');
  const [toBranchId, setToBranchId] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);

  const branches = useQuery<BranchRecord[]>({
    queryKey: ['branches', 'list'],
    meta: { silent: true },
    queryFn: () => branchApi.list(),
  });

  const batches = useQuery<Batch[]>({
    queryKey: ['branch', fromBranchId, 'batches'],
    meta: { silent: true },
    enabled: Boolean(fromBranchId),
    queryFn: () => branchInventoryApi.batches(fromBranchId, 200),
  });

  const activeBranches = (branches.data ?? []).filter((branch) => branch.status === 'ACTIVE');
  const batchOptions = useMemo(
    () =>
      (batches.data ?? [])
        .filter((batch) => batch.balanceQuantity > 0)
        .map((batch) => ({
          value: batch.id,
          label: batch.medicineName,
          description: [
            `Batch ${batch.batchNumber ?? '—'}`,
            batch.expiryDate ? `expires ${new Date(batch.expiryDate).toLocaleDateString()}` : 'no expiry',
            `${batch.balanceQuantity} ${batch.unit} available`,
          ].join(' · '),
        })),
    [batches.data],
  );

  const chosenBatch = (batches.data ?? []).find((batch) => batch.id === batchId) ?? null;
  const selectedFrom = activeBranches.find((branch) => branch.id === fromBranchId) ?? null;

  const addLine = () => {
    setError(null);
    if (!batchId || !chosenBatch) {
      setError('Choose the batch to transfer.');
      return;
    }
    if (lines.some((line) => line.sourceBatchId === batchId)) {
      setError('That batch is already on this transfer. Change its quantity instead.');
      return;
    }
    const value = Number(quantity);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a quantity greater than zero.');
      return;
    }
    if (value > chosenBatch.balanceQuantity) {
      setError(`Only ${chosenBatch.balanceQuantity} ${chosenBatch.unit} are available in this branch.`);
      return;
    }
    setLines([...lines, { sourceBatchId: batchId, quantity: value }]);
    setBatchId('');
    setQuantity('');
  };

  const save = async (mode: 'draft' | 'submit') => {
    setError(null);
    if (!fromBranchId) {
      setError('Choose the source branch.');
      return;
    }
    if (!toBranchId) {
      setError('Choose the destination branch.');
      return;
    }
    if (fromBranchId === toBranchId) {
      setError('The source and destination branch must be different.');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one batch to transfer.');
      return;
    }

    setSaving(mode);
    try {
      await transferApi.create({
        fromBranchId,
        toBranchId,
        note: note.trim() || undefined,
        submit: mode === 'submit',
        lines,
      });
      toast.success(mode === 'submit' ? 'Transfer submitted.' : 'Transfer saved as a draft.');
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not save this transfer.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From branch" required>
          <SearchableSelect
            options={activeBranches.map((branch) => ({
              value: branch.id,
              label: branch.name,
              description: branch.code,
            }))}
            value={fromBranchId}
            onChange={(value) => {
              setFromBranchId(value);
              setLines([]);
              setBatchId('');
            }}
            placeholder="Choose the source branch"
            searchPlaceholder="Search branches…"
            ariaLabel="Source branch"
            loading={branches.isLoading}
          />
        </Field>

        <Field label="To branch" required>
          <SearchableSelect
            options={activeBranches
              .filter((branch) => branch.id !== fromBranchId)
              .map((branch) => ({
                value: branch.id,
                label: branch.name,
                description: branch.code,
              }))}
            value={toBranchId}
            onChange={setToBranchId}
            placeholder="Choose the destination branch"
            searchPlaceholder="Search branches…"
            ariaLabel="Destination branch"
            loading={branches.isLoading}
          />
        </Field>
      </div>

      <div className="rounded-md border border-border p-4">
        <h3 className="text-sm font-semibold text-ink">Batches to move</h3>
        <p className="text-xs text-slate">
          {selectedFrom
            ? `Stock leaves ${selectedFrom.name} when the transfer is dispatched.`
            : 'Choose the source branch to see the stock that can move.'}
        </p>

        {fromBranchId && batches.isLoading ? <SectionLoader label="Loading branch stock…" className="py-3" /> : null}
        {fromBranchId && batches.error ? (
          <p className="mt-2 text-sm text-danger">We could not load the source branch's stock.</p>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
          <Field label="Medicine and batch">
            <SearchableSelect
              options={batchOptions}
              value={batchId}
              onChange={setBatchId}
              placeholder={fromBranchId ? 'Choose a batch' : 'Choose the source branch first'}
              searchPlaceholder="Search medicines…"
              emptyMessage="This branch has no batch with stock."
              ariaLabel="Batch"
              disabled={!fromBranchId}
              loading={batches.isLoading}
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              min={0}
              step="0.001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="0"
              disabled={!batchId}
            />
          </Field>
          <Button type="button" variant="outline" onClick={addLine} disabled={!batchId}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            Add
          </Button>
        </div>

        {lines.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {lines.map((line) => {
              const batch = (batches.data ?? []).find((row) => row.id === line.sourceBatchId);
              return (
                <li key={line.sourceBatchId} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{batch?.medicineName ?? 'Batch'}</p>
                    <p className="text-xs text-slate">
                      Batch {batch?.batchNumber ?? '—'}
                      {batch?.expiryDate ? ` · expires ${new Date(batch.expiryDate).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink">
                      {line.quantity} {batch?.unit ?? ''}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove line"
                      className="rounded p-1 text-slate hover:bg-slate-100 hover:text-danger"
                      onClick={() =>
                        setLines(lines.filter((row) => row.sourceBatchId !== line.sourceBatchId))
                      }
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-slate">No batches added yet.</p>
        )}
      </div>

      <Field label="Note" htmlFor="transfer-note" hint="Optional: why this stock is moving.">
        <Input
          id="transfer-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Rebalance stock before the weekend"
        />
      </Field>

      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={saving !== null} onClick={() => void save('submit')}>
          {saving === 'submit' ? 'Submitting…' : 'Submit transfer'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving !== null}
          onClick={() => void save('draft')}
        >
          {saving === 'draft' ? 'Saving…' : 'Save as draft'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving !== null}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
