'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Medicine } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InlineLoader } from '@/components/ui/loading';

export interface AssignBarcodePanelProps {
  barcode: string;
  onAssigned: () => void;
}

/**
 * Lets an authorised user attach an unknown barcode to an existing product.
 * Uniqueness is enforced by the API, so a barcode already in use is reported
 * instead of silently moved.
 */
export function AssignBarcodePanel({ barcode, onAssigned }: AssignBarcodePanelProps) {
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const products = useQuery<Medicine[]>({
    queryKey: ['pharmacy', 'medicines', 'scan-assign', search],
    // Search failures are shown under the search box, next to the field the
    // user just used.
    meta: { silent: true },
    queryFn: () =>
      apiFetch<Medicine[]>(`/pharmacy/medicines?limit=10&q=${encodeURIComponent(search)}`),
    enabled: search.trim().length >= 2,
  });

  const assign = useMutation({
    meta: {
      successMessage: 'Barcode assigned successfully.',
      errorMessage: 'Unable to assign this barcode. Please try again.',
    },
    mutationFn: (productId: string) =>
      apiFetch(`/pharmacy/barcodes/product/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ barcode }),
      }),
    onSuccess: () => onAssigned(),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSelectedId(null);
    setSearch(term.trim());
  };

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <h3 className="text-sm font-semibold text-ink">Assign {barcode} to an existing product</h3>
      <p className="mt-1 text-xs text-slate">
        Search the catalogue, select the product, then save. Each barcode can belong to one product
        per pharmacy.
      </p>

      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search product name"
          aria-label="Search products to assign the barcode"
        />
        <Button type="submit" variant="outline" disabled={term.trim().length < 2}>
          Search
        </Button>
      </form>

      {products.isFetching ? (
        <div className="mt-3 text-xs text-slate">
          <InlineLoader label="Searching the catalogue…" />
        </div>
      ) : null}

      {products.error ? (
        <p className="mt-3 text-xs text-danger">
          {products.error instanceof Error ? products.error.message : 'Search failed.'}
        </p>
      ) : null}

      {products.data && products.data.length === 0 ? (
        <p className="mt-3 text-xs text-slate">
          No products match that search. Create the product first, then assign the barcode.
        </p>
      ) : null}

      {products.data && products.data.length > 0 ? (
        <div className="mt-3 space-y-2">
          {products.data.map((product) => (
            <label
              key={product.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-surface p-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="assign-product"
                  value={product.id}
                  checked={selectedId === product.id}
                  onChange={() => setSelectedId(product.id)}
                />
                <span>
                  <span className="font-medium text-ink">{product.name}</span>
                  <span className="block text-xs text-slate">
                    {product.barcode ? `Current barcode ${product.barcode}` : 'No barcode recorded'}
                  </span>
                </span>
              </span>
              <span className="text-xs text-slate">{product.unit}</span>
            </label>
          ))}

          <Button
            onClick={() => selectedId && assign.mutate(selectedId)}
            disabled={!selectedId || assign.isPending}
          >
            <Tag className="mr-2 h-4 w-4" aria-hidden="true" />
            {assign.isPending ? <InlineLoader label="Assigning…" /> : 'Assign barcode'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
