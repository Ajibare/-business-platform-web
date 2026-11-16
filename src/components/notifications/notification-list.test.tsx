import { fireEvent, render, screen } from '@testing-library/react';
import { AppNotification } from '@/types/api';
import { NotificationList } from './notification-list';

const notification: AppNotification = {
  id: 'notification-1',
  type: 'EXPIRY_REMINDER',
  title: 'Paracetamol 500mg Tablet expires in 90 day(s)',
  body: 'Batch PC2451 expires on 14 Feb 2027. 240 tablet recorded.',
  severity: 'warning',
  productId: 'product-1',
  batchId: 'batch-1',
  metadata: null,
  createdAt: '2026-11-16T08:00:00.000Z',
  readAt: null,
};

describe('NotificationList', () => {
  it('shows the reminder details and marks unread items', () => {
    render(<NotificationList notifications={[notification]} />);

    expect(screen.getByText(notification.title)).toBeInTheDocument();
    expect(screen.getByText(/240 tablet recorded/)).toBeInTheDocument();
    expect(screen.getByText(/Unread/)).toBeInTheDocument();
  });

  it('calls back with the notification id when marking read', () => {
    const onMarkRead = jest.fn();
    render(<NotificationList notifications={[notification]} onMarkRead={onMarkRead} />);

    fireEvent.click(screen.getByRole('button', { name: /mark read/i }));

    expect(onMarkRead).toHaveBeenCalledWith('notification-1');
  });

  it('renders an empty state', () => {
    render(<NotificationList notifications={[]} emptyMessage="Nothing unread." />);
    expect(screen.getByText('Nothing unread.')).toBeInTheDocument();
  });
});
