'use client';

import { History } from 'lucide-react';
import { Card } from '@/components/ui/card';

export interface ScanHistoryEntry {
  code: string;
  productName: string;
  scannedAt: string;
}

export interface ProductScanHistoryProps {
  entries: ScanHistoryEntry[];
  onSelect: (code: string) => void;
}

/**
 * Recent scans for the current session only. Scan history is intentionally not
 * persisted: scanning is a read-only lookup and no scan log table exists yet.
 */
export function ProductScanHistory({ entries, onSelect }: ProductScanHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <History className="h-4 w-4 text-slate" aria-hidden="true" />
        Recent scans in this session
      </h2>
      <ul className="mt-2 divide-y divide-border">
        {entries.map((entry) => (
          <li key={`${entry.code}-${entry.scannedAt}`} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm font-medium text-ink">{entry.productName}</p>
              <p className="text-xs text-slate">
                {entry.code} · {new Date(entry.scannedAt).toLocaleTimeString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelect(entry.code)}
              className="text-xs font-medium text-primary-700 hover:underline"
            >
              Open again
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
