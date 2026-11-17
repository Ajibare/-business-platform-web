import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { apiFetch } from '@/services/api';
import { Sale } from '@/types/api';
import { RecordSale } from './record-sale';

jest.mock('@/services/api', () => ({ apiFetch: jest.fn() }));
jest.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ role: 'OWNER' }) }));

const apiFetchMock = apiFetch as jest.Mock;

const sale: Sale = {
  id: 'sale-1',
  organizationId: 'o1',
  reference: 'SALE-20261117-ABC123',
  status: 'COMPLETED',
  occurredAt: '2026-11-17T09:15:00.000Z',
  customerName: 'Walk-in',
  note: null,
  subtotal: 2500,
  discountTotal: 0,
  refundTotal: 0,
  revenue: 2500,
  netSales: 2500,
  costTotal: 1800,
  grossProfit: 700,
  unitCount: 10,
  voidedAt: null,
  createdAt: '2026-11-17T09:15:00.000Z',
  lines: [
    {
      id: 'line-1',
      productId: 'p1',
      medicineName: 'Paracetamol 500mg Tablet',
      batchId: 'b1',
      batchNumber: 'PC2451',
      quantity: 10,
      returnedQuantity: 0,
      unitPrice: 250,
      discount: 0,
      lineTotal: 2500,
      unitCost: 180,
      costTotal: 1800,
    },
  ],
};

function renderSale() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecordSale />
    </QueryClientProvider>,
  );
}

/** Both queries hit the real paths; the stock list is empty unless a test says otherwise. */
function respondWith(sales: Sale[] | (() => Promise<never>)) {
  apiFetchMock.mockImplementation((path: string) => {
    if (path.startsWith('/pharmacy/inventory/stock')) return Promise.resolve([]);
    return typeof sales === 'function' ? sales() : Promise.resolve(sales);
  });
}

describe('RecordSale', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  /**
   * `apiFetch` hands back the unwrapped list, not `{ data, meta }`. Reading
   * `meta` off it threw a TypeError on the first successful render, which is
   * what crashed the sales page.
   */
  it('renders the empty state without crashing', async () => {
    respondWith([]);
    renderSale();

    expect(await screen.findByText('No sales recorded yet.')).toBeInTheDocument();
  });

  it('renders a sale returned by the API', async () => {
    respondWith([sale]);
    renderSale();

    expect(await screen.findByText('SALE-20261117-ABC123')).toBeInTheDocument();
    expect(screen.getByText(/10 unit\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Paracetamol 500mg Tablet/)).toBeInTheDocument();
    expect(screen.getByText('1 most recent')).toBeInTheDocument();
  });

  it('shows the API error message instead of an empty list', async () => {
    respondWith(() => Promise.reject(new Error('We could not reach the server.')));
    renderSale();

    expect(await screen.findByText('We could not reach the server.')).toBeInTheDocument();
    expect(screen.queryByText('No sales recorded yet.')).toBeNull();
  });
});
