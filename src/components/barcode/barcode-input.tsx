'use client';

import { FormEvent, useId } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (code: string) => void;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Manual barcode or SKU entry. Used on its own when the camera is unavailable
 * or unsupported, and alongside the camera scanner as a fallback.
 */
export function BarcodeInput({
  value,
  onChange,
  onSubmit,
  label = 'Barcode or SKU',
  placeholder = 'Scan or type a barcode',
  submitLabel = 'Look up',
  disabled,
  autoFocus,
}: BarcodeInputProps) {
  const inputId = useId();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const code = value.trim();
    if (code) onSubmit(code);
  };

  return (
    <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
      <div className="flex-1">
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-ink">
          {label}
        </label>
        <Input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          inputMode="text"
          disabled={disabled}
        />
      </div>
      <Button type="submit" disabled={disabled || value.trim().length === 0}>
        <Search className="mr-2 h-4 w-4" aria-hidden="true" />
        {submitLabel}
      </Button>
    </form>
  );
}
