import { cn } from '@/lib/utils';

/**
 * One animation for every waiting state in the product. It lives in `public/` so
 * it is served and cached like any other static asset, and it is referenced
 * only from here: a second copy anywhere else is the bug this file prevents.
 */
export const LOADING_GIF = '/loading.gif';

interface LoaderProps {
  /** Read out by a screen reader and shown under the animation. */
  label?: string;
  className?: string;
}

/**
 * The animation on its own. `alt` is empty because every caller either renders
 * its own status text or is purely decorative next to a label.
 */
export function LoadingGif({ className }: { className?: string }) {
  return (
    // A static 64px GIF needs no optimiser, so `next/image` would only add weight.
    <img
      src={LOADING_GIF}
      alt=""
      width={64}
      height={64}
      aria-hidden="true"
      className={cn('h-10 w-10 select-none', className)}
    />
  );
}

/**
 * Full-page wait: first paint of a protected screen, or a route that has no
 * content to show yet. Centred and responsive by construction.
 */
export function PageLoader({ label = 'Loading…', className }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-[60vh] w-full flex-col items-center justify-center gap-3 p-6 text-center',
        className,
      )}
    >
      <LoadingGif className="h-14 w-14" />
      <p className="text-sm text-slate">{label}</p>
    </div>
  );
}

/**
 * Section-level wait: a card, table or list that is still fetching. The rest of
 * the page stays interactive, which is why this does not cover the viewport.
 */
export function SectionLoader({ label = 'Loading…', className }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 py-8 text-center',
        className,
      )}
    >
      <LoadingGif className="h-9 w-9" />
      <p className="text-xs text-slate">{label}</p>
    </div>
  );
}

/** For a button that is already working; the label says what is happening. */
export function InlineLoader({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoadingGif className="h-4 w-4" />
      {label}
    </span>
  );
}

/**
 * Sits over a block that must not be edited while a save is in flight. The
 * parent needs `relative` positioning.
 */
export function LoadingOverlay({ label = 'Working…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-white/70"
    >
      <LoadingGif className="h-8 w-8" />
      <p className="text-xs font-medium text-slate">{label}</p>
    </div>
  );
}
