'use client';

import { ImportColumnSchema } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';

export interface ColumnMappingTableProps {
  columns: ImportColumnSchema[];
  headers: string[];
  mapping: Record<string, string | null>;
  onChange: (key: string, header: string | null) => void;
  disabled?: boolean;
}

/**
 * Shows how each template column was matched to a header in the uploaded file
 * and lets the user correct the match before validating again.
 */
export function ColumnMappingTable({
  columns,
  headers,
  mapping,
  onChange,
  disabled,
}: ColumnMappingTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase text-slate">
            <th scope="col" className="py-2 pr-3">Template column</th>
            <th scope="col" className="py-2 pr-3">Required</th>
            <th scope="col" className="py-2 pr-3">Matched header in your file</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => {
            const value = mapping[column.key] ?? '';
            return (
              <tr key={column.key} className="border-b border-border last:border-0">
                <td className="py-2 pr-3">
                  <p className="font-medium text-ink">{column.header}</p>
                  <p className="text-xs text-slate">{column.description}</p>
                </td>
                <td className="py-2 pr-3">
                  <Badge status={column.required ? 'warning' : 'neutral'}>
                    {column.required ? 'Required' : 'Optional'}
                  </Badge>
                </td>
                <td className="py-2 pr-3">
                  <SearchableSelect
                    ariaLabel={`Map ${column.header}`}
                    value={value}
                    disabled={disabled}
                    onChange={(next) => onChange(column.key, next || null)}
                    options={[
                      { value: '', label: 'Not mapped' },
                      ...headers.map((header) => ({ value: header, label: header })),
                    ]}
                    placeholder="Not mapped"
                    searchPlaceholder="Search file headers…"
                    emptyMessage="No header in your file matches that search."
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
