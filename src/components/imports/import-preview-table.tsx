'use client';

import { ImportColumnSchema, ImportJobRow } from '@/types/api';
import { Badge } from '@/components/ui/badge';

export interface ImportPreviewTableProps {
  columns: ImportColumnSchema[];
  rows: ImportJobRow[];
  limit?: number;
}

const rowStatus = (status: ImportJobRow['status']) => {
  switch (status) {
    case 'VALID':
      return 'success' as const;
    case 'IMPORTED':
      return 'success' as const;
    case 'INVALID':
      return 'danger' as const;
    case 'FAILED':
      return 'danger' as const;
    default:
      return 'warning' as const;
  }
};

/**
 * Row preview with per-row validation outcome. Invalid and duplicate rows are
 * always visible here so nothing is skipped silently.
 */
export function ImportPreviewTable({ columns, rows, limit = 25 }: ImportPreviewTableProps) {
  const visible = rows.slice(0, limit);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-slate">
              <th scope="col" className="py-2 pr-3">Row</th>
              <th scope="col" className="py-2 pr-3">Status</th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="py-2 pr-3">
                  {column.header}
                </th>
              ))}
              <th scope="col" className="py-2">Issues</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.rowNumber} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 text-xs text-slate">{row.rowNumber}</td>
                <td className="py-2 pr-3">
                  <Badge status={rowStatus(row.status)}>{row.status}</Badge>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="py-2 pr-3 text-xs text-ink">
                    {row.values?.[column.key] || <span className="text-slate">—</span>}
                  </td>
                ))}
                <td className="py-2 text-xs text-danger">
                  {row.errors?.length ? row.errors.join(' ') : <span className="text-slate">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > visible.length ? (
        <p className="mt-2 text-xs text-slate">
          Showing the first {visible.length} of {rows.length} validated rows. The error report
          contains every row that needs attention.
        </p>
      ) : null}
    </div>
  );
}
