import { ReactNode } from 'react';
import Link from 'next/link';
import { BellRing, PackageSearch, ShieldCheck } from 'lucide-react';

const HIGHLIGHTS = [
  {
    icon: PackageSearch,
    title: 'Know what is on the shelf',
    body: 'Recorded stock balances, batches and reorder thresholds in one place.',
  },
  {
    icon: BellRing,
    title: 'Catch expiry before it costs you',
    body: 'Near-expiry and low-stock warnings based on the dates you recorded.',
  },
  {
    icon: ShieldCheck,
    title: 'One workspace, the right people',
    body: 'Owners, managers and inventory staff each see only their pharmacy.',
  },
];

/**
 * Shared shell for every unauthenticated page: brand panel on the left, the
 * form in a single readable column on the right. It renders no pharmacy data,
 * only product messaging, so it is safe on public routes.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[42%] max-w-xl flex-col justify-between bg-primary-700 p-10 text-white lg:flex">
        <Link href="/" className="inline-flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <PackageSearch className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Pharmacy Stock Intelligence
          </span>
        </Link>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-semibold leading-tight">
              Stock decisions made with records, not guesswork.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/80">
              Built for Nigerian pharmacies that need to see what is expiring, what is running
              low, and what has actually been recorded.
            </p>
          </div>

          <ul className="space-y-5">
            {HIGHLIGHTS.map((highlight) => {
              const Icon = highlight.icon;
              return (
                <li key={highlight.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/15">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{highlight.title}</p>
                    <p className="mt-1 text-sm leading-5 text-white/75">{highlight.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs leading-5 text-white/60">
          Pharmacy Stock Intelligence records stock. It does not store patient information and does
          not provide clinical advice.
        </p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pt-6 lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2 text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-600 text-white">
              <PackageSearch className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">Pharmacy Stock Intelligence</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[440px]">{children}</div>
        </div>

        <footer className="px-4 pb-6 text-center text-xs text-slate">
          Recorded balances are not physical stock counts.
        </footer>
      </main>
    </div>
  );
}
