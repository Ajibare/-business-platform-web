import { HTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const toneStyles: Record<AlertTone, { container: string; icon: typeof Info }> = {
  info: { container: 'border-info/40 bg-info-soft text-ink', icon: Info },
  success: { container: 'border-success/40 bg-success-soft text-ink', icon: CheckCircle2 },
  warning: { container: 'border-warning/40 bg-warning-soft text-ink', icon: AlertTriangle },
  danger: { container: 'border-danger/40 bg-danger-soft text-ink', icon: XCircle },
};

const iconColors: Record<AlertTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  title?: string;
  action?: ReactNode;
}

export function Alert({ tone = 'info', title, action, className, children, ...props }: AlertProps) {
  const Icon = toneStyles[tone].icon;

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-md border p-4 text-sm', toneStyles[tone].container, className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColors[tone])} aria-hidden="true" />
        <div className="flex-1">
          {title ? <p className="font-medium text-ink">{title}</p> : null}
          {children ? <div className={cn(title ? 'mt-1' : '', 'text-slate')}>{children}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
