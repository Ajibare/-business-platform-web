import { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink disabled:cursor-not-allowed disabled:bg-background',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
