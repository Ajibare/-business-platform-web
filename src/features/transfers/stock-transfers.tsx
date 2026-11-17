'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftRight, Check, Plus, Send, Truck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { SectionLoader } from '@/components/ui/loading';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { usePermissions } from '@/hooks/use-permissions';
import { userMessageFor } from '@/lib/api-errors';
import { organisationApi, transferApi } from '@/services/platform';
import type { TransferRecord, TransferStatus } from '@/types/platform';
import { TransferCreate } from './transfer-create';

const STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In transit',
  RECEIVED: 'Received',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const STATUS_TONES: Record<TransferStatus, 'neutral' | 'warning' | 'info' | 'success' | 'danger'> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  IN_TRANSIT: 'info',
  RECEIVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'neutral',
};

export function StockTransfers() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('');
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [received, setReceived] = useState<Record<string, { received: string; damaged: string }>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const transfers = useQuery<TransferRecord[]>({
    queryKey: ['transfers', status, direction],
    meta: { silent: true },
    queryFn: () =>
      transferApi.list({
        status: (status || undefined) as TransferStatus | undefined,
        direction,
        limit: 100,
      }),
  });

  const settings = useQuery({
    queryKey: ['organisation', 'settings'],
    meta: { silent: true },
    enabled: can('organisation:read'),
    queryFn: () => organisationApi.settings(),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['transfers'] });
    // A dispatch or receipt changes stock in both branches.
    await queryClient.invalidateQueries({ queryKey: ['branch'] });
    await queryClient.invalidateQueries({ queryKey: ['pharmacy'] });
  };

  const run = async (key: string, action: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await action();
      toast.success(message);
      await refresh();
      return true;
    } catch (error) {
      toast.error(userMessageFor(error, 'That step could not be completed.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const toggleApproval = async (required: boolean) => {
    try {
      await organisationApi.updateSettings({ requireTransferApproval: required });
      toast.success(
        required
          ? 'Transfers now need approval before dispatch.'
          : 'Transfers no longer need approval.',
      );
      await settings.refetch();
    } catch (error) {
      toast.error(userMessageFor(error, 'We could not change that setting.'));
    }
  };

  const openReceive = (transfer: TransferRecord) => {
    const next: Record<string, { received: string; damaged: string }> = {};
    for (const line of transfer.lines) {
      next[line.id] = { received: String(line.quantity), damaged: '0' };
    }
    setReceived(next);
    setReceivingId(transfer.id);
    setRejectingId(null);
  };

  const submitReceive = async (transfer: TransferRecord) => {
    const lines = transfer.lines.map((line) => {
      const entry = received[line.id] ?? { received: String(line.quantity), damaged: '0' };
      return {
        lineId: line.id,
        receivedQuantity: Number(entry.received || 0),
        damagedQuantity: Number(entry.damaged || 0),
      };
    });
    setBusy(`${transfer.id}:receive`);
    try {
      await transferApi.receive(transfer.id, { lines });
      toast.success('Transfer received. Stock is now in the destination branch.');
      setReceivingId(null);
      await refresh();
    } catch (error) {
      toast.error(userMessageFor(error, 'We could not receive this transfer.'));
    } finally {
      setBusy(null);
    }
  };

  const rows = transfers.data ?? [];
  const canRequest = can('transfer:request');
  const approvalRequired = settings.data?.requireTransferApproval ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock transfers"
        description="Move stock between branches. Units leave the source when dispatched and arrive at the destination when received."
        actions={
          canRequest ? (
            <Button onClick={() => setCreating((open) => !open)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {creating ? 'Close form' : 'New transfer'}
            </Button>
          ) : null
        }
      />

      {settings.data ? (
        <Card className="p-4">
          <Switch
            checked={approvalRequired}
            label="Require approval before dispatch"
            description={
              approvalRequired
                ? 'A transfer waits for someone with the approve permission before stock can leave.'
                : 'Anyone with the dispatch permission can send a transfer straight out.'
            }
            disabled={!can('organisation:manage')}
            onCheckedChange={(next) => {
              if (can('organisation:manage')) void toggleApproval(next);
            }}
          />
        </Card>
      ) : null}

      {creating && canRequest ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">New transfer</h2>
          <p className="text-sm text-slate">
            Stock is reserved only when the transfer is dispatched, and arrives only when it is
            received.
          </p>
          <div className="mt-4">
            <TransferCreate
              onCreated={() => {
                setCreating(false);
                void refresh();
              }}
              onCancel={() => setCreating(false)}
            />
          </div>
        </Card>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <ArrowLeftRight className="h-5 w-5 text-info" aria-hidden="true" />
            Transfers
          </h2>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <SearchableSelect
              options={(Object.keys(STATUS_LABELS) as TransferStatus[]).map((value) => ({
                value,
                label: STATUS_LABELS[value],
              }))}
              value={status}
              onChange={setStatus}
              placeholder="Any status"
              searchPlaceholder="Search statuses…"
              ariaLabel="Filter by status"
              clearable
            />
            <SearchableSelect
              options={[
                { value: 'all', label: 'All directions' },
                { value: 'in', label: 'Incoming' },
                { value: 'out', label: 'Outgoing' },
              ]}
              value={direction}
              onChange={(value) => setDirection((value || 'all') as 'all' | 'in' | 'out')}
              ariaLabel="Filter by direction"
            />
          </div>
        </div>

        {transfers.isLoading ? <SectionLoader label="Loading transfers…" /> : null}

        {transfers.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">We could not load transfers for this branch.</p>
            <Button variant="outline" className="mt-3" onClick={() => transfers.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {transfers.data && rows.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={ArrowLeftRight}
            title="No transfers match this view"
            description="Create a transfer to move stock to another branch, or clear a filter."
          />
        ) : null}

        {rows.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {rows.map((transfer) => {
              const key = (action: string) => `${transfer.id}:${action}`;
              return (
                <li key={transfer.id} className="rounded-md border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{transfer.reference}</p>
                        <Badge status={STATUS_TONES[transfer.status]}>
                          {STATUS_LABELS[transfer.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate">
                        {transfer.fromBranchName} → {transfer.toBranchName}
                        {transfer.note ? ` · ${transfer.note}` : ''}
                      </p>
                      <p className="text-xs text-slate">
                        Requested {new Date(transfer.createdAt).toLocaleString()}
                        {transfer.receivedAt
                          ? ` · received ${new Date(transfer.receivedAt).toLocaleString()}`
                          : transfer.dispatchedAt
                            ? ` · dispatched ${new Date(transfer.dispatchedAt).toLocaleString()}`
                            : ''}
                      </p>
                      {transfer.rejectedReason ? (
                        <p className="mt-1 text-xs text-danger">Rejected: {transfer.rejectedReason}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {transfer.status === 'DRAFT' && canRequest ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busy === key('submit')}
                            onClick={() =>
                              void run(key('submit'), () => transferApi.submit(transfer.id), 'Transfer submitted.')
                            }
                          >
                            Submit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === key('cancel')}
                            onClick={() =>
                              void run(key('cancel'), () => transferApi.cancel(transfer.id), 'Transfer cancelled.')
                            }
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}

                      {transfer.status === 'PENDING_APPROVAL' && can('transfer:approve') ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busy === key('approve')}
                            onClick={() =>
                              void run(
                                key('approve'),
                                () => transferApi.approve(transfer.id),
                                'Transfer approved.',
                              )
                            }
                          >
                            <Check className="mr-1 h-4 w-4" aria-hidden="true" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectingId(transfer.id)}
                          >
                            <X className="mr-1 h-4 w-4" aria-hidden="true" />
                            Reject
                          </Button>
                        </>
                      ) : null}

                      {transfer.status === 'APPROVED' && can('transfer:dispatch') ? (
                        <Button
                          size="sm"
                          disabled={busy === key('dispatch')}
                          onClick={() =>
                            void run(
                              key('dispatch'),
                              () => transferApi.dispatch(transfer.id),
                              'Transfer dispatched. Stock left the source branch.',
                            )
                          }
                        >
                          <Send className="mr-1 h-4 w-4" aria-hidden="true" />
                          Dispatch
                        </Button>
                      ) : null}

                      {transfer.status === 'IN_TRANSIT' && can('transfer:receive') ? (
                        <Button size="sm" onClick={() => openReceive(transfer)}>
                          <Truck className="mr-1 h-4 w-4" aria-hidden="true" />
                          Receive
                        </Button>
                      ) : null}

                      {transfer.status === 'APPROVED' && canRequest && can('transfer:approve') ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy === key('cancel')}
                          onClick={() =>
                            void run(key('cancel'), () => transferApi.cancel(transfer.id), 'Transfer cancelled.')
                          }
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1 text-sm">
                    {transfer.lines.map((line) => (
                      <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 text-slate">
                        <span className="text-ink">{line.productName}</span>
                        <span>
                          Batch {line.batchNumber ?? '—'}
                          {line.expiryDate ? ` · expires ${new Date(line.expiryDate).toLocaleDateString()}` : ''}
                          {' · '}
                          {line.quantity} {line.unit}
                          {transfer.status === 'RECEIVED'
                            ? ` (received ${line.receivedQuantity}${line.damagedQuantity > 0 ? `, ${line.damagedQuantity} damaged` : ''})`
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {rejectingId === transfer.id ? (
                    <div className="mt-3 rounded-md border border-border p-3">
                      <Field label="Reason for rejecting" required>
                        <Input
                          value={rejectReason}
                          onChange={(event) => setRejectReason(event.target.value)}
                          placeholder="Stock is reserved for the weekend"
                        />
                      </Field>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy === key('reject') || rejectReason.trim().length === 0}
                          onClick={async () => {
                            const done = await run(
                              key('reject'),
                              () => transferApi.reject(transfer.id, rejectReason.trim()),
                              'Transfer rejected.',
                            );
                            if (done) {
                              setRejectingId(null);
                              setRejectReason('');
                            }
                          }}
                        >
                          Confirm rejection
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {receivingId === transfer.id ? (
                    <div className="mt-3 rounded-md border border-border p-3">
                      <p className="text-sm font-medium text-ink">Confirm what arrived</p>
                      <p className="text-xs text-slate">
                        Damaged units are received then written off, so the branch balance stays
                        accurate.
                      </p>
                      <div className="mt-3 space-y-2">
                        {transfer.lines.map((line) => {
                          const entry = received[line.id] ?? { received: String(line.quantity), damaged: '0' };
                          return (
                            <div key={line.id} className="grid gap-2 sm:grid-cols-[1fr_120px_120px] sm:items-center">
                              <p className="text-sm text-ink">{line.productName}</p>
                              <label className="text-xs text-slate">
                                Received
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  value={entry.received}
                                  onChange={(event) =>
                                    setReceived((current) => ({
                                      ...current,
                                      [line.id]: { ...entry, received: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                              <label className="text-xs text-slate">
                                Damaged
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  value={entry.damaged}
                                  onChange={(event) =>
                                    setReceived((current) => ({
                                      ...current,
                                      [line.id]: { ...entry, damaged: event.target.value },
                                    }))
                                  }
                                />
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy === key('receive')}
                          onClick={() => void submitReceive(transfer)}
                        >
                          {busy === key('receive') ? 'Receiving…' : 'Confirm receipt'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReceivingId(null)}>
                          Close
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}
