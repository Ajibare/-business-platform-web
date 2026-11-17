'use client';

import {
  KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { LoadingGif } from '@/components/ui/loading';
import { cn } from '@/lib/utils';

export interface SearchableOption {
  value: string;
  label: string;
  /** Second line, for example a barcode, phone number or current balance. */
  description?: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Shown on the trigger while nothing is selected. */
  placeholder?: string;
  searchPlaceholder?: string;
  /** Shown when the typed term matches nothing. */
  emptyMessage?: string;
  /** Renders a Clear control. Offer it for optional fields only. */
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /**
   * Called with the typed term. Use it when the list must be searched on the
   * server instead of filtered in the browser.
   */
  onSearchChange?: (term: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
  name?: string;
  /** Accessible name for the trigger when no visible `label` is rendered. */
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * The only dropdown in the application.
 *
 * A native select element cannot be searched, so long lists (medicines,
 * suppliers) forced people to scroll. This keeps the design-system look, filters
 * as you type, and works with the keyboard: arrows move, Enter selects, Escape
 * closes. Options are filtered locally unless `onSearchChange` is supplied, in
 * which case the parent owns the query.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select…',
  searchPlaceholder = 'Type to search…',
  emptyMessage = 'No matching option.',
  clearable = false,
  disabled = false,
  loading = false,
  onSearchChange,
  error,
  required = false,
  id,
  name,
  ariaLabel,
  size = 'md',
  className,
}: SearchableSelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listId = `${triggerId}-list`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const selected = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    if (onSearchChange) return options;
    const needle = term.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      `${option.label} ${option.description ?? ''}`.toLowerCase().includes(needle),
    );
  }, [onSearchChange, options, term]);

  // Close on an outside click so the popup cannot be left floating open.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // The search box is the first thing to type into once the list opens. This
  // deliberately runs on open only: re-running it as the filter narrows would
  // fight the user's own arrow-key movement.
  useEffect(() => {
    if (!open) return;
    const selectedIndex = filtered.findIndex((option) => option.value === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(filtered));
    if (!onSearchChange) searchRef.current?.focus();
  }, [open]);

  const openList = () => {
    if (disabled) return;
    setTerm('');
    onSearchChange?.('');
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    setTerm('');
    if (refocus) document.getElementById(triggerId)?.focus();
  };

  const select = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.value);
    close();
  };

  const move = (delta: number) => {
    if (filtered.length === 0) return;
    let index = activeIndex;
    for (let step = 0; step < filtered.length; step++) {
      index = (index + delta + filtered.length) % filtered.length;
      if (!filtered[index].disabled) break;
    }
    setActiveIndex(index);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openList();
      return;
    }
    // Keyboard users get the same clearing the mouse gets from the Clear icon.
    if (clearable && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      onChange('');
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) select(option);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (clearable && event.key === 'Backspace' && term === '') {
      event.preventDefault();
      onChange('');
      close();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  const height = size === 'sm' ? 'h-8 text-xs' : 'h-10 text-sm';

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label ? (
        <label htmlFor={triggerId} className="mb-1 block text-xs font-medium text-ink">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}

      <div className="relative">
        <button
          id={triggerId}
          type="button"
          role="combobox"
          aria-label={label ? undefined : ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          onClick={() => (open ? close() : openList())}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left',
            height,
            error ? 'border-danger' : 'border-border',
            disabled ? 'cursor-not-allowed bg-background text-slate' : 'text-ink hover:bg-slate-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
          )}
        >
          <span className={cn('truncate', selected ? 'text-ink' : 'text-slate')}>
            {selected ? selected.label : placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && !disabled ? (
              <span
                role="button"
                tabIndex={-1}
                aria-label={label ? `Clear ${label}` : 'Clear selection'}
                className="rounded p-0.5 text-slate hover:bg-slate-100 hover:text-ink"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange('');
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            ) : null}
            {loading ? (
              <LoadingGif className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate" aria-hidden="true" />
            )}
          </span>
        </button>

        {open ? (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-lg">
            <div className="border-b border-border p-2">
              <input
                ref={searchRef}
                type="search"
                value={term}
                role="searchbox"
                aria-label={searchPlaceholder}
                aria-controls={listId}
                placeholder={searchPlaceholder}
                autoComplete="off"
                className="h-9 w-full rounded-md border border-border bg-white px-2 text-sm text-ink placeholder:text-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                onChange={(event) => {
                  setTerm(event.target.value);
                  onSearchChange?.(event.target.value);
                  setActiveIndex(firstEnabledIndex(filtered));
                }}
                onKeyDown={onSearchKeyDown}
              />
            </div>

            <ul id={listId} role="listbox" aria-label={label ?? placeholder} className="max-h-64 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-4 text-center text-xs text-slate">
                  <LoadingGif className="mx-auto mb-1 h-6 w-6" />
                  Loading options…
                </li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-3 text-center text-xs text-slate">{emptyMessage}</li>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = option.value === value;
                  return (
                    <li
                      key={option.value}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      className={cn(
                        'flex cursor-pointer items-start gap-2 px-3 py-2 text-sm',
                        option.disabled && 'cursor-not-allowed opacity-50',
                        index === activeIndex && !option.disabled && 'bg-slate-100',
                        isSelected ? 'font-medium text-primary-700' : 'text-ink',
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => select(option)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.description ? (
                          <span className="block truncate text-xs text-slate">{option.description}</span>
                        ) : null}
                      </span>
                      {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {name ? <input type="hidden" name={name} value={value} /> : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function firstEnabledIndex(options: SearchableOption[]): number {
  const index = options.findIndex((option) => !option.disabled);
  return index;
}
