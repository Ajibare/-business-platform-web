import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Links and buttons that act on the whole screen. */
  actions?: ReactNode;
}

/** The title block every administration screen starts with. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {description ? <p className="text-sm text-slate">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
