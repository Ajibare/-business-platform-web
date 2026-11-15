'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Search } from 'lucide-react';
import { apiFetch } from '@/services/api';
import { Supplier } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface SupplierListResponse {
  data: Supplier[];
  meta: { total: number };
}

export function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const suppliers = useQuery<SupplierListResponse>({
    queryKey: ['pharmacy', 'suppliers', search],
    queryFn: () =>
      apiFetch<SupplierListResponse>(
        `/pharmacy/suppliers?limit=100${search ? `&q=${encodeURIComponent(search)}` : ''}`,
      ),
  });

  const createSupplier = useMutation({
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
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'suppliers'] });
    },
    onError: (err: Error) => setError(err.message || 'Unable to create supplier'),
  });

  const canCreate = name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Suppliers</h1>
        <p className="text-sm text-slate">Manage suppliers used on stock receipts.</p>
      </div>

      {error ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-ink">Unable to save the supplier</h2>
          <p className="mt-2 text-sm text-slate">{error}</p>
        </Card>
      ) : null}

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
            Add supplier
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

        {suppliers.isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
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

        {suppliers.data && suppliers.data.data.length === 0 ? (
          <div className="mt-4">
            <p className="text-sm text-slate">No suppliers recorded yet.</p>
          </div>
        ) : null}

        {suppliers.data && suppliers.data.data.length > 0 ? (
          <div className="mt-4 space-y-2">
            {suppliers.data.data.map((supplier) => (
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
