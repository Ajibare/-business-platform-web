import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Badge, BadgeProps } from './badge';
import { Card } from './card';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  description?: string;
  icon?: LucideIcon;
  status?: BadgeProps['status'];
  badgeLabel?: string;
  unavailable?: boolean;
  footnote?: ReactNode;
  className?: string;
}

/**
 * Shared KPI tile. When a metric cannot be produced from recorded data the
 * card renders an explicit "Not available" state instead of a fabricated
 * number.
 */
export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  status = 'neutral',
  badgeLabel,
  unavailable = false,
  footnote,
  className,
}: MetricCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-slate" aria-hidden="true" /> : null}
          <p className="text-sm font-medium text-slate">{label}</p>
        </div>
        <Badge status={status}>{badgeLabel ?? (unavailable ? 'Not available' : label)}</Badge>
      </div>

      <p className={cn('mt-2 text-3xl font-semibold', unavailable ? 'text-slate' : 'text-ink')}>
        {unavailable ? '—' : value}
      </p>

      {description ? <p className="mt-2 text-sm text-slate">{description}</p> : null}
      {footnote ? <div className="mt-2 text-xs text-slate">{footnote}</div> : null}
    </Card>
  );
}
