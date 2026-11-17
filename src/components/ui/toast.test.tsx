import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toaster, toast } from '@/components/ui/toast';

/**
 * The popup is the only feedback channel in the product, so these tests pin the
 * rules from the design brief: a green confirmation, a red alert, one popup per
 * message, manual and automatic dismissal, and a stack that never covers itself.
 */
function renderToaster() {
  render(<Toaster />);
  return screen.getByTestId('toaster');
}

function announce(message: string) {
  act(() => {
    toast.success(message);
  });
}

beforeEach(() => {
  toast.clear();
});

afterEach(() => {
  act(() => toast.clear());
  jest.useRealTimers();
});

describe('success popup', () => {
  it('shows the confirmation with a green check indicator', () => {
    renderToaster();
    announce('Medicine created successfully.');

    const popup = screen.getByRole('status');
    expect(popup).toHaveTextContent('Medicine created successfully.');
    expect(popup.className).toContain('border-l-success');
    expect(popup.querySelector('svg')?.getAttribute('class')).toContain('text-success');
  });

  it('announces a success to a screen reader politely, not as an alarm', () => {
    renderToaster();
    announce('Sale recorded successfully.');

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('error popup', () => {
  it('shows the failure in red and reads it out immediately', () => {
    renderToaster();
    act(() => {
      toast.error('Insufficient stock to complete this sale.');
    });

    const popup = screen.getByRole('alert');
    expect(popup).toHaveTextContent('Insufficient stock to complete this sale.');
    expect(popup.className).toContain('border-l-danger');
    expect(popup.querySelector('svg')?.getAttribute('class')).toContain('text-danger');
  });
});

describe('the stack', () => {
  it('never shows the same message twice', () => {
    renderToaster();
    act(() => {
      // Two layers reporting the same failed write is one popup, not two.
      toast.error('Unable to load products.');
      toast.error('Unable to load products.');
    });

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('keeps a success and an error apart', () => {
    renderToaster();
    announce('Supplier created successfully.');
    act(() => {
      toast.error('Unable to load products.');
    });

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('stacks several notifications instead of overlapping them', () => {
    renderToaster();
    for (let index = 1; index <= 6; index += 1) {
      announce(`Saved item ${index}.`);
    }

    const popups = screen.getAllByRole('status');
    expect(popups).toHaveLength(5);
    // The oldest is dropped: the newest outcome is the one that matters.
    expect(screen.queryByText('Saved item 1.')).toBeNull();
    expect(screen.getByText('Saved item 6.')).toBeInTheDocument();
  });

  it('ignores an empty message', () => {
    renderToaster();
    act(() => {
      toast.success('   ');
    });

    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('dismissal', () => {
  it('lets the user close a notification', () => {
    jest.useFakeTimers();
    renderToaster();
    act(() => {
      toast.error('Unable to load products.');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    // The card plays its exit animation before it is removed.
    expect(screen.getByRole('alert').className).toContain('toast-out');

    act(() => {
      jest.advanceTimersByTime(160);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('dismisses itself after the dwell time for its variant', () => {
    jest.useFakeTimers();
    renderToaster();
    announce('Changes saved successfully.');

    act(() => {
      jest.advanceTimersByTime(4499);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    act(() => {
      jest.advanceTimersByTime(160);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('waits while the pointer rests on the message', () => {
    jest.useFakeTimers();
    renderToaster();
    announce('Import completed successfully.');

    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole('status'));
    act(() => {
      jest.advanceTimersByTime(4500);
    });
    act(() => {
      jest.advanceTimersByTime(160);
    });
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('placement', () => {
  it('renders from a portal above drawers, modals and dropdowns', () => {
    const container = renderToaster();

    expect(container.parentElement).toBe(document.body);
    // z-[60] clears the highest layer in the app (z-50).
    expect(container.className).toContain('z-[60]');
    // The column itself ignores the pointer, so the page stays usable.
    expect(container.className).toContain('pointer-events-none');
    expect(container.className).toContain('sm:right-4');
  });

  it('wraps a long message instead of stretching the layout', () => {
    renderToaster();
    announce(
      'The import finished but twelve rows were skipped because the batch expiry date was earlier than the receipt date. Download the error report to see each row.',
    );

    const body = screen.getByRole('status').querySelector('p');
    expect(body?.className).toContain('break-words');
    expect(body).toHaveTextContent('Download the error report');
  });
});
