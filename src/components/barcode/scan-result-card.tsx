'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeftRight, ClipboardCheck, Package, ShieldCheck } from 'lucide-react';
import { BarcodeBatch, BarcodeLookup } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/format';

const expiryBadge = (status: BarcodeBatch['expiryStatus']) => {
  switch (status) {
    case 'EXPIRED':
      return { status: 'danger' as const, label: 'Expired' };
    case 'EXPIRING_SOON':
      return { status: 'warning' as const, label: 'Expiring soon' };
    case 'OK':
      return { status: 'success' as const, label: 'OK' };
    default:
      return { status: 'neutral' as const, label: 'No expiry recorded' };
  }
};

export interface ScanResultCardProps {
  result: BarcodeLookup;
  onRecordMovement?: (batch: BarcodeBatch) => void;
  onStartCount?: () => void;
  actionSlot?: ReactNode;
}

/**
 * Presents a scanned product with its batches and the next operational
 * actions. This component never changes stock; every action links to an
 * explicit workflow.
 */
export function ScanResultCard({
  result,
  onRecordMovement,
  onStartCount,
  actionSlot,
}: ScanResultCardProps) {
  const { product, batches } = result;
  const subtitle = [product.brand, product.strength, product.dosageForm, product.packSize]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-slate">Product found</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{product.name}</h2>
          {subtitle ? <p className="text-sm text-slate">{subtitle}</p> : null}
          <p className="mt-2 text-xs text-slate">
            Barcode {result.barcode} · {product.unit}
            {product.reorderThreshold !== null
              ? ` · Reorder at ${product.reorderThreshold}`
              : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-slate">Recorded stock</p>
          <p className="text-2xl font-semibold text-ink">
            {product.totalRecordedQuantity} {product.unit}
          </p>
          <Badge status={product.active ? 'success' : 'neutral'}>
            {product.active ? 'Active product' : 'Inactive product'}
          </Badge>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Package className="h-4 w-4 text-slate" aria-hidden="true" />
          Batches ({batches.length})
        </h3>

        {batches.length === 0 ? (
          <p className="mt-2 text-sm text-slate">
            This product has no recorded batches yet. Record a stock receipt or use bulk import to
            add opening stock.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {batches.map((batch) => {
              const badge = expiryBadge(batch.expiryStatus);
              return (
                <li
                  key={batch.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Batch {batch.batchNumber ?? '—'}
                    </p>
                    <p className="text-xs text-slate">
                      {batch.expiryDate ? `Expires ${formatDate(batch.expiryDate)}` : 'No expiry recorded'}
                      {batch.daysToExpiry !== null
                        ? ` · ${batch.daysToExpiry < 0 ? `${Math.abs(batch.daysToExpiry)} day(s) ago` : `${batch.daysToExpiry} day(s) left`}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-ink">
                        {batch.balanceQuantity} {batch.unit}
                      </p>
                      <p className="text-xs text-slate">
                        {batch.sellingPrice !== null ? `Sells at ${batch.sellingPrice}` : 'No selling price'}
                      </p>
                    </div>
                    <Badge status={badge.status}>{badge.label}</Badge>
                    {onRecordMovement ? (
                      <Button variant="outline" size="sm" onClick={() => onRecordMovement(batch)}>
                        <ArrowLeftRight className="mr-1 h-3 w-3" aria-hidden="true" />
                        Record movement
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Link
          href="/products/pharmacy/batches"
          className="inline-flex h-8 items-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-background"
        >
          View all batches
        </Link>
        <Link
          href="/products/pharmacy/movements"
          className="inline-flex h-8 items-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-background"
        >
          Stock movements
        </Link>
        {onStartCount ? (
          <Button variant="outline" size="sm" onClick={onStartCount}>
            <ClipboardCheck className="mr-1 h-3 w-3" aria-hidden="true" />
            Start stock count
          </Button>
        ) : (
          <Link
            href="/products/pharmacy/counts"
            className="inline-flex h-8 items-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-background"
          >
            <ClipboardCheck className="mr-1 h-3 w-3" aria-hidden="true" />
            Stock counts
          </Link>
        )}
        {actionSlot}
      </div>

      <p className="mt-3 flex items-start gap-2 text-xs text-slate">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-success" aria-hidden="true" />
        Scanning only looks up the product. Stock changes require a recorded movement or an approved
        workflow. Sales are not available in this workspace yet.
      </p>
    </Card>
  );
}

export interface UnknownBarcodeCardProps {
  barcode: string;
  onRetry?: () => void;
  children?: ReactNode;
}

export function UnknownBarcodeCard({ barcode, onRetry, children }: UnknownBarcodeCardProps) {
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />
        Product not found
      </h2>
      <p className="mt-2 text-sm text-slate">
        No product in this pharmacy uses the barcode <span className="font-medium text-ink">{barcode}</span>.
        Check the packaging, try manual SKU entry, or assign this barcode to an existing product.
      </p>
      {onRetry ? (
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          Try another barcode
        </Button>
      ) : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}
