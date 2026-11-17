'use client';

import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error';

export interface ToastOptions {
  /** How long the popup stays up. Defaults per variant. */
  duration?: number;
}

interface ToastRecord {
  id: number;
  variant: ToastVariant;
  message: string;
  duration: number;
}

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4500,
  // Read errors take longer to absorb than a one-line confirmation.
  error: 7000,
};

/** The same words for the same operation within this window is one popup, not two. */
const DEDUPE_WINDOW_MS = 2500;

/** Beyond this the stack stops being a notification and starts being a wall. */
const MAX_VISIBLE = 5;

const EMPTY: ToastRecord[] = [];

let records: ToastRecord[] = [];
let nextId = 1;
let lastPush = { key: '', at: 0 };
let lastId = 0;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function push(variant: ToastVariant, message: string, options?: ToastOptions): number {
  const text = message.trim();
  if (!text) return 0;

  const key = `${variant}:${text}`;
  const now = Date.now();
  const alreadyVisible = records.some((record) => `${record.variant}:${record.message}` === key);
  if (alreadyVisible || (key === lastPush.key && now - lastPush.at < DEDUPE_WINDOW_MS)) {
    // Returning the existing id lets a caller dismiss what it thinks it created.
    return records.find((record) => `${record.variant}:${record.message}` === key)?.id ?? 0;
  }

  lastPush = { key, at: now };
  const record: ToastRecord = {
    id: nextId++,
    variant,
    message: text,
    duration: options?.duration ?? DEFAULT_DURATION[variant],
  };
  lastId = record.id;
  records = [...records, record].slice(-MAX_VISIBLE);
  emit();
  return record.id;
}

function dismiss(id: number) {
  if (!records.some((record) => record.id === id)) return;
  records = records.filter((record) => record.id !== id);
  emit();
}

/**
 * The one way the product reports an outcome. Call it from anywhere: mutations,
 * query caches, event handlers.
 *
 *   toast.success('Medicine created successfully.');
 *   toast.error('Unable to load products.');
 *
 * Message copy is the caller's job, but it must come from a safe place:
 * `userMessageFor()` already replaces 5xx and transport text.
 */
export const toast = {
  success(message: string, options?: ToastOptions) {
    return push('success', message, options);
  },
  error(message: string, options?: ToastOptions) {
    return push('error', message, options);
  },
  /** Last id created, useful in tests. */
  get lastId() {
    return lastId;
  },
  dismiss,
  /** Clears the stack, e.g. between tests or on sign-out. */
  clear() {
    if (records.length === 0) return;
    records = [];
    lastPush = { key: '', at: 0 };
    emit();
  },
};

function useToasts(): ToastRecord[] {
  return useSyncExternalStore(subscribe, () => records, () => EMPTY);
}

const VARIANT_STYLES: Record<ToastVariant, { Icon: typeof CheckCircle2; icon: string; edge: string }> = {
  success: { Icon: CheckCircle2, icon: 'text-success', edge: 'border-l-success' },
  error: { Icon: AlertCircle, icon: 'text-danger', edge: 'border-l-danger' },
};

function ToastCard({ record }: { record: ToastRecord }) {
  const { Icon, icon, edge } = VARIANT_STYLES[record.variant];
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);

  const close = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    // Let the exit animation finish before the card is removed from the list.
    window.setTimeout(() => toast.dismiss(record.id), 160);
  }, [leaving, record.id]);

  useEffect(() => {
    if (paused || leaving) return;
    const timer = window.setTimeout(close, record.duration);
    return () => window.clearTimeout(timer);
  }, [paused, leaving, close, record.duration]);

  return (
    <div
      role={record.variant === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-md border border-border border-l-4 bg-surface p-3 shadow-lg',
        edge,
        leaving ? 'toast-out' : 'toast-in',
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', icon)} aria-hidden="true" />
      <p className="min-w-0 flex-1 break-words text-sm leading-snug text-ink">{record.message}</p>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate hover:bg-background hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Rendered once at the root. A portal keeps the stack above modals, drawers and
 * dropdowns, and a fixed column means several popups stack instead of covering
 * each other. On a phone it spans the width; from `sm` up it sits top-right.
 */
export function Toaster() {
  const items = useToasts();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div
      data-testid="toaster"
      className="pointer-events-none fixed inset-x-3 top-3 z-[60] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[22rem]"
    >
      {items.map((record) => (
        <ToastCard key={record.id} record={record} />
      ))}
    </div>,
    document.body,
  );
}
