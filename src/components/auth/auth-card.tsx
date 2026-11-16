import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AuthCardProps {
  title: string;
  description?: ReactNode;
  /** Small label above the title, for example "Step 2 of 2". */
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * The single panel every auth screen hangs its form in. It owns the heading so
 * each page cannot drift in hierarchy or spacing.
 */
export function AuthCard({
  title,
  description,
  eyebrow,
  children,
  footer,
  className,
}: AuthCardProps) {
  return (
    <section
      className={cn('rounded-lg border border-border bg-surface p-6 shadow-card sm:p-8', className)}
      aria-labelledby="auth-card-title"
    >
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700">
          {eyebrow}
        </p>
      ) : null}
      <h1 id="auth-card-title" className="text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      {description ? (
        <div className="mt-2 space-y-2 text-sm leading-6 text-slate">{description}</div>
      ) : null}
      <div className="mt-6">{children}</div>
      {footer ? (
        <div className="mt-6 border-t border-border pt-5 text-sm text-slate">{footer}</div>
      ) : null}
    </section>
  );
}
