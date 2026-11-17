'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Search } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Supplier } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InlineLoader, SectionLoader } from '@/components/ui/loading';

/**
 * `apiFetch` already unwraps the API envelope, so the query returns the list
 * itself. Declaring `{ data, meta }` here made the first successful render read
 * `undefined.length` and crash the page.
 */
export function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const suppliers = useQuery<Supplier[]>({
    queryKey: ['pharmacy', 'suppliers', search],
    // The list renders its own error panel with a retry, so it must not also
    // raise a popup for the same failure.
    meta: { silent: true },
    queryFn: () =>
      apiFetch<Supplier[]>(
        `/pharmacy/suppliers?limit=100${search ? `&q=${encodeURIComponent(search)}` : ''}`,
      ),
  });

  const createSupplier = useMutation({
    meta: {
      successMessage: 'Supplier created successfully.',
      errorMessage: 'Failed to create the supplier. Please try again.',
    },
    mutationFn: async () => {
      const created = await apiFetch<Supplier>('/pharmacy/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          email: email || undefined,
        }),
      });
      return created;
    },
    onSuccess: () => {
      setName('');
      setPhone('');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'suppliers'] });
    },
  });

  const canCreate = name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Suppliers</h1>
        <p className="text-sm text-slate">Manage suppliers used on stock receipts.</p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink">New supplier</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Supplier name"
            className="h-10 rounded-md border border-border bg-white px-3 text-sm text-ink"
            aria-label="Supplier name"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="h-10 rounded-md border border-border bg-white px-3 text-sm text-ink"
            aria-label="Phone"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="h-10 rounded-md border border-border bg-white px-3 text-sm text-ink"
            aria-label="Email"
          />
        </div>
        <div className="mt-4">
          <Button onClick={() => createSupplier.mutate()} disabled={createSupplier.isPending || !canCreate}>
            <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
            {createSupplier.isPending ? <InlineLoader label="Saving supplier…" /> : 'Add supplier'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Suppliers</h2>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers"
              className="h-9 w-56 rounded-md border border-border bg-white pl-8 pr-3 text-sm text-ink"
              aria-label="Search suppliers"
            />
          </div>
        </div>

        {suppliers.isFetching && !suppliers.isLoading ? (
          <div className="mt-3 text-xs text-slate">
            <InlineLoader label="Searching suppliers…" />
          </div>
        ) : null}

        {suppliers.isLoading ? (
          <SectionLoader label="Loading suppliers…" className="py-6" />
        ) : null}

        {suppliers.error ? (
          <div className="mt-4">
            <p className="text-sm text-danger">
              {suppliers.error instanceof Error ? suppliers.error.message : 'Unable to load suppliers.'}
            </p>
            <Button variant="outline" className="mt-3" onClick={() => suppliers.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {suppliers.data && suppliers.data.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-slate">
              {search ? 'No supplier matches that search.' : 'No suppliers recorded yet.'}
            </p>
          </div>
        ) : null}

        {suppliers.data && suppliers.data.length > 0 ? (
          <div className="mt-4 space-y-2">
            {suppliers.data.map((supplier) => (
              <div
                key={supplier.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{supplier.name}</p>
                  <p className="text-xs text-slate">
                    {supplier.phone ?? 'No phone'} · {supplier.email ?? 'No email'}
                  </p>
                </div>
                <Badge status={supplier.active ? 'success' : 'neutral'}>
                  {supplier.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
