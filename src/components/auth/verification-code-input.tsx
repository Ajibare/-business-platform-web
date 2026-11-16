'use client';

import {
  ClipboardEvent,
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
} from 'react';
import { cn } from '@/lib/utils';

const CODE_LENGTH = 6;

export interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once the sixth digit is present, so the form can submit itself. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
  label?: string;
  hint?: string;
  error?: string;
}

/**
 * Six separate boxes over one compact digit string. Everything a person expects
 * from a code field works: typing advances, backspace goes back, the code can be
 * pasted anywhere, arrow keys move, and mobile keyboards open on numbers.
 */
export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
  label = 'Verification code',
  hint,
  error,
}: VerificationCodeInputProps) {
  const groupId = useId();
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (autoFocus) inputs.current[0]?.focus();
  }, [autoFocus]);

  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '');

  const focusBox = (index: number) => {
    const bounded = Math.min(CODE_LENGTH - 1, Math.max(0, index));
    inputs.current[bounded]?.focus();
    inputs.current[bounded]?.select();
  };

  const commit = (next: string) => {
    const compact = next.replace(/\D/g, '').slice(0, CODE_LENGTH);
    onChange(compact);
    if (compact.length === CODE_LENGTH) onComplete?.(compact);
    return compact;
  };

  const handleChange = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;

    // Typing into a filled box replaces that digit; typing past the end appends.
    const next =
      index < value.length
        ? value.slice(0, index) + typed.slice(-1) + value.slice(index + 1)
        : value.slice(0, index) + typed;

    const compact = commit(next);
    if (index + 1 < CODE_LENGTH) focusBox(Math.min(compact.length, CODE_LENGTH - 1));
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
        focusBox(index);
        return;
      }
      if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        focusBox(index - 1);
      }
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      commit(value.slice(0, index) + value.slice(index + 1));
      focusBox(index);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    const compact = commit(pasted);
    focusBox(Math.min(compact.length, CODE_LENGTH - 1));
  };

  const describedBy = error
    ? `${groupId}-error`
    : hint
      ? `${groupId}-hint`
      : undefined;

  return (
    <div className="space-y-1.5">
      <span id={`${groupId}-label`} className="block text-sm font-medium text-ink">
        {label}
      </span>

      <div
        role="group"
        aria-labelledby={`${groupId}-label`}
        aria-describedby={describedBy}
        className="flex gap-2 sm:gap-3"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={handlePaste}
            onFocus={(event) => event.target.select()}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={1}
            aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
            aria-invalid={invalid || undefined}
            className={cn(
              'h-14 w-full min-w-0 rounded-md border bg-white text-center text-xl font-semibold text-ink shadow-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:bg-slate-100',
              invalid ? 'border-danger' : 'border-border',
            )}
          />
        ))}
      </div>

      {error ? (
        <p id={`${groupId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${groupId}-hint`} className="text-xs text-slate">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
