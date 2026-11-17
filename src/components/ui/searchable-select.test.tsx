import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { SearchableSelect, SearchableOption } from './searchable-select';

const OPTIONS: SearchableOption[] = [
  { value: 'p1', label: 'Paracetamol 500mg', description: '12 tablet available' },
  { value: 'p2', label: 'Amoxicillin 250mg', description: '4 capsule available' },
  { value: 'p3', label: 'Vitamin C', description: '0 tablet available', disabled: true },
];

/** The component is controlled, so every test needs a real parent. */
function Harness({
  initial = '',
  clearable = false,
  error,
}: {
  initial?: string;
  clearable?: boolean;
  error?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SearchableSelect
      label="Medicine"
      value={value}
      onChange={setValue}
      options={OPTIONS}
      clearable={clearable}
      error={error}
      searchPlaceholder="Type to search…"
      emptyMessage="No matching option."
    />
  );
}

describe('SearchableSelect', () => {
  it('opens on click and lists every option', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Medicine' }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('filters the options as the user types', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Medicine' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'amox' } });

    expect(screen.getByRole('option', { name: /Amoxicillin/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Paracetamol/ })).toBeNull();
  });

  it('says so when nothing matches', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Medicine' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });

    expect(screen.getByText('No matching option.')).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('selects a clicked option and closes the list', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Medicine' }));
    fireEvent.click(screen.getByRole('option', { name: /Amoxicillin/ }));

    expect(screen.getByRole('combobox', { name: 'Medicine' })).toHaveTextContent(
      'Amoxicillin 250mg',
    );
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('moves with the arrow keys and selects with Enter', () => {
    render(<Harness />);

    const trigger = screen.getByRole('combobox', { name: 'Medicine' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const search = screen.getByRole('searchbox');
    // The first enabled option is already active, so one more step lands on the second.
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Medicine' })).toHaveTextContent(
      'Amoxicillin 250mg',
    );
  });

  it('closes on Escape without changing the selection', () => {
    render(<Harness initial="p1" />);

    const trigger = screen.getByRole('combobox', { name: 'Medicine' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveTextContent('Paracetamol 500mg');
  });

  it('does not offer disabled options', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Medicine' }));
    fireEvent.click(screen.getByRole('option', { name: /Vitamin C/ }));

    expect(screen.getByRole('combobox', { name: 'Medicine' })).not.toHaveTextContent('Vitamin C');
  });

  it('clears an optional selection from the keyboard', () => {
    render(<Harness initial="p1" clearable />);

    const trigger = screen.getByRole('combobox', { name: 'Medicine' });
    fireEvent.keyDown(trigger, { key: 'Backspace' });

    expect(trigger).toHaveTextContent('Select…');
  });

  it('shows the validation message it is given', () => {
    render(<Harness error="Choose a medicine." />);

    expect(screen.getByText('Choose a medicine.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Medicine' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
