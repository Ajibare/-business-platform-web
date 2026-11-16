'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ScanLine } from 'lucide-react';
import { ApiError, apiFetch } from '@/services/api';
import { BarcodeBatch, BarcodeLookup } from '@/types/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AssignBarcodePanel } from '@/components/barcode/assign-barcode-panel';
import { BarcodeInput } from '@/components/barcode/barcode-input';
import { BarcodeScanner } from '@/components/barcode/barcode-scanner';
import {
  ProductScanHistory,
  ScanHistoryEntry,
} from '@/components/barcode/product-scan-history';
import { ScanResultCard, UnknownBarcodeCard } from '@/components/barcode/scan-result-card';
import { MovementForm } from '@/components/pharmacy/movement-form';

export function ScanProduct() {
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BarcodeBatch | null>(null);

  const lookup = useQuery<BarcodeLookup>({
    queryKey: ['pharmacy', 'barcode', code],
    queryFn: () => apiFetch<BarcodeLookup>(`/pharmacy/barcodes/lookup?code=${encodeURIComponent(code)}`),
    enabled: code.length > 0,
    retry: false,
  });

  const handleCode = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput(trimmed);
    setCode(trimmed);
    setSelectedBatch(null);
  }, []);

  useEffect(() => {
    if (!lookup.data) return;
    const entry: ScanHistoryEntry = {
      code: lookup.data.barcode,
      productName: lookup.data.product.name,
      scannedAt: new Date().toISOString(),
    };

    setHistory((current) => [
      entry,
      ...current.filter((item) => item.code !== entry.code),
    ].slice(0, 5));
  }, [lookup.data]);

  const notFound = lookup.error instanceof ApiError && lookup.error.statusCode === 404;
  const otherError = lookup.error && !notFound;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
          <ScanLine className="h-6 w-6 text-primary-700" aria-hidden="true" />
          Scan product
        </h1>
        <p className="text-sm text-slate">
          Scan a pack or type a barcode to find the product and its batches. Scanning never changes
          stock; record a movement to update the ledger.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-ink">Camera scan</h2>
            <p className="mt-1 text-xs text-slate">
              The camera is only used while scanning and is released afterwards. EAN-13, EAN-8 and
              UPC are read on supported browsers.
            </p>
            <div className="mt-3">
              <BarcodeScanner onDetected={handleCode} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink">Manual entry</h2>
            <p className="mt-1 text-xs text-slate">
              Use the barcode printed on the pack, or an internal SKU stored as the product barcode.
            </p>
            <div className="mt-3">
              <BarcodeInput value={input} onChange={setInput} onSubmit={handleCode} />
            </div>
            <p className="mt-3 text-xs text-slate">
              Cannot find the product by barcode?{' '}
              <Link href="/products/pharmacy" className="font-medium text-primary-700 hover:underline">
                Browse the product catalogue
              </Link>
              .
            </p>
          </div>
        </div>
      </Card>

      {lookup.isLoading && code ? (
        <Card className="p-6">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="mt-4 h-20 w-full" />
        </Card>
      ) : null}

      {otherError ? (
        <Alert
          tone="danger"
          title="Barcode lookup failed"
          action={
            <Button variant="outline" size="sm" onClick={() => lookup.refetch()}>
              Retry
            </Button>
          }
        >
          {lookup.error instanceof Error ? lookup.error.message : 'Please try again.'}
        </Alert>
      ) : null}

      {notFound && code ? (
        <UnknownBarcodeCard
          barcode={code}
          onRetry={() => {
            setCode('');
            setInput('');
          }}
        >
          <AssignBarcodePanel barcode={code} onAssigned={() => lookup.refetch()} />
        </UnknownBarcodeCard>
      ) : null}

      {lookup.data ? (
        <>
          <ScanResultCard
            result={lookup.data}
            onRecordMovement={(batch) => setSelectedBatch(batch)}
          />

          {selectedBatch ? (
            <MovementForm
              batchId={selectedBatch.id}
              batchLabel={`${lookup.data.product.name} · batch ${selectedBatch.batchNumber ?? selectedBatch.id.slice(0, 8)} · recorded ${selectedBatch.balanceQuantity} ${selectedBatch.unit}`}
              unit={selectedBatch.unit}
              onRecorded={() => {
                setSelectedBatch(null);
                lookup.refetch();
              }}
              onCancel={() => setSelectedBatch(null)}
            />
          ) : null}
        </>
      ) : null}

      <ProductScanHistory
        entries={history}
        onSelect={(previous) => {
          setInput(previous);
          setCode(previous);
          setSelectedBatch(null);
        }}
      />
    </div>
  );
}
