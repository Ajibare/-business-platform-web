import { fireEvent, render, screen } from '@testing-library/react';
import { BarcodeLookup } from '@/types/api';
import { ScanResultCard } from './scan-result-card';

const result: BarcodeLookup = {
  barcode: '6151100010203',
  product: {
    id: 'product-1',
    name: 'Paracetamol 500mg Tablet',
    brand: 'Emzor',
    strength: '500mg',
    dosageForm: 'Tablet',
    packSize: '10 x 10',
    unit: 'tablet',
    barcode: '6151100010203',
    reorderThreshold: 50,
    active: true,
    totalRecordedQuantity: 240,
  },
  batches: [
    {
      id: 'batch-1',
      batchNumber: 'PC2451',
      expiryDate: '2027-01-01T00:00:00.000Z',
      unit: 'tablet',
      unitCost: 18.5,
      sellingPrice: 25,
      balanceQuantity: 240,
      daysToExpiry: 46,
      expiryStatus: 'EXPIRING_SOON',
    },
  ],
};

describe('ScanResultCard', () => {
  it('shows the product, its batches and expiry status', () => {
    render(<ScanResultCard result={result} />);

    expect(screen.getByText('Paracetamol 500mg Tablet')).toBeInTheDocument();
    expect(screen.getByText('Batch PC2451')).toBeInTheDocument();
    expect(screen.getByText('Expiring soon')).toBeInTheDocument();
    expect(screen.getAllByText('240 tablet')).toHaveLength(2);
  });

  it('requests a movement for the selected batch instead of changing stock', () => {
    const onRecordMovement = jest.fn();
    render(<ScanResultCard result={result} onRecordMovement={onRecordMovement} />);

    fireEvent.click(screen.getByRole('button', { name: /record movement/i }));

    expect(onRecordMovement).toHaveBeenCalledWith(result.batches[0]);
  });

  it('explains that sales are not available', () => {
    render(<ScanResultCard result={result} />);
    expect(screen.getByText(/Sales are not available in this workspace yet/)).toBeInTheDocument();
  });
});
