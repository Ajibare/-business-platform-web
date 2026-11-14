import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'border-transparent bg-slate-900 text-white',
  success: 'border-transparent bg-success/10 text-success',
  warning: 'border-transparent bg-warning/10 text-warning',
  danger: 'border-transparent bg-danger/10 text-danger',
  info: 'border-transparent bg-info/10 text-info',
  discrepancy: 'border-transparent bg-discrepancy/10 text-discrepancy',
  neutral: 'border-transparent bg-neutral/10 text-neutral',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: keyof typeof badgeVariants;
}

export function Badge({ className, status, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        status ? badgeVariants[status] : badgeVariants.default,
        className,
      )}
      {...props}
    />
  );
}
