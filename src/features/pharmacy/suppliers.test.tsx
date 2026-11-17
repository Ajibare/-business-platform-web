import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { apiFetch } from '@/services/api';
import { Supplier } from '@/types/api';
import { Suppliers } from './suppliers';

jest.mock('@/services/api', () => ({ apiFetch: jest.fn() }));

const apiFetchMock = apiFetch as jest.Mock;

const supplier: Supplier = {
  id: 'sup-1',
  organizationId: 'o1',
  name: 'Kigali Wholesale Ltd',
  phone: '+250788000111',
  email: 'orders@kigaliwholesale.rw',
  active: true,
  createdAt: '2026-11-10T08:00:00.000Z',
  updatedAt: '2026-11-10T08:00:00.000Z',
};

function renderSuppliers() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suppliers />
    </QueryClientProvider>,
  );
}

function respondWith(suppliers: Supplier[] | (() => Promise<never>)) {
  apiFetchMock.mockImplementation(() =>
    typeof suppliers === 'function' ? suppliers() : Promise.resolve(suppliers),
  );
}

describe('Suppliers', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  /**
   * The list endpoint used to answer 400 for `?limit=100`; the page then also
   * read `data.data` off an already-unwrapped array and crashed. This is the
   * exact page the user reported, so both halves are pinned here.
   */
  it('requests a valid page size and renders the suppliers it gets back', async () => {
    respondWith([supplier]);
    renderSuppliers();

    expect(await screen.findByText('Kigali Wholesale Ltd')).toBeInTheDocument();
    expect(screen.getByText(/\+250788000111/)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith('/pharmacy/suppliers?limit=100');
  });

  it('renders the empty state without crashing', async () => {
    respondWith([]);
    renderSuppliers();

    expect(await screen.findByText('No suppliers recorded yet.')).toBeInTheDocument();
  });

  it('shows the loading GIF while the list is in flight', async () => {
    respondWith(() => new Promise<never>(() => undefined));
    renderSuppliers();

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Loading suppliers…');
    expect(status.querySelector('img')).toHaveAttribute('src', '/loading.gif');
    expect(screen.queryByText('No suppliers recorded yet.')).toBeNull();
  });

  it('shows the API error and a retry instead of an empty list', async () => {
    respondWith(() => Promise.reject(new Error('We could not reach the server.')));
    renderSuppliers();

    expect(await screen.findByText('We could not reach the server.')).toBeInTheDocument();
    expect(screen.queryByText('No suppliers recorded yet.')).toBeNull();
  });
});
