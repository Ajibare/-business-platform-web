'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Message shown under the field. Replaces the hint while present. */
  error?: string;
  hint?: string;
  /** Rendered at the end of the label row, for example a "Forgot password?" link. */
  labelAction?: ReactNode;
  /** Rendered inside the field, for example a show/hide password toggle. */
  trailing?: ReactNode;
}

/**
 * Auth fields are 48px tall on purpose: they are the primary interaction on
 * these pages, often used one-handed on a phone. Labels are always visible, so
 * a filled-in field never loses its name.
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { label, error, hint, labelAction, trailing, className, id, name, required, ...props },
  ref,
) {
  const inputId = id ?? name ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          ) : null}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <input
          id={inputId}
          name={name}
          ref={ref}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-12 w-full rounded-md border bg-white px-3 text-sm text-ink shadow-sm transition-colors',
            'placeholder:text-slate-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1',
            'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate',
            error ? 'border-danger' : 'border-border',
            trailing ? 'pr-11' : undefined,
            className,
          )}
          {...props}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
