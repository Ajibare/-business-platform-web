'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

/**
 * Shown on the dashboard after setup is complete while optional tasks are still
 * open. It disappears on its own once every item is done, so it cannot become
 * permanent clutter.
 */
export function SetupChecklist() {
  const { profile, role } = useAuth();
  const onboarding = profile?.onboarding;

  if (!onboarding) return null;
  if (role !== 'OWNER') return null;
  if (onboarding.requiresSetup) return null;
  if (onboarding.allTasksDone) return null;

  const remaining = onboarding.checklist.filter((item) => !item.done);

  return (
    <section
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
      aria-labelledby="setup-checklist-title"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="setup-checklist-title" className="text-sm font-semibold text-ink">
          Finish setting up
        </h2>
        <p className="text-xs text-slate">
          {remaining.length} task{remaining.length === 1 ? '' : 's'} left
        </p>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {onboarding.checklist.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              )}
              <span className={item.done ? 'text-slate line-through' : 'text-ink'}>
                {item.label}
                {item.optional ? <span className="text-slate"> · optional</span> : null}
              </span>
            </span>

            {item.done ? (
              <span className="shrink-0 text-xs text-success">Done</span>
            ) : (
              <Link
                href="/onboarding/pharmacy-setup"
                className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-700 underline-offset-4 hover:underline"
              >
                Do it
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
