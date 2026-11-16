'use client';

import { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * Accessible on/off control used by notification preferences.
 * The visible label is associated with the switch through aria-labelledby.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
  id,
  ...props
}: SwitchProps) {
  const labelId = `${id ?? label.replace(/\s+/g, '-').toLowerCase()}-label`;

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <p id={labelId} className="text-sm font-medium text-ink">
          {label}
        </p>
        {description ? <p className="mt-1 text-xs text-slate">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 disabled:opacity-50',
          checked ? 'bg-primary-600' : 'bg-border',
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
