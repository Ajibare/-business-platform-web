'use client';

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { userMessageFor } from '@/lib/api-errors';
import { ApiError } from '@/services/api';

const LOAD_FAILED = 'Unable to load this data. Please try again.';
const ACTION_FAILED = 'Something went wrong. Please try again.';

/** 401 is handled by the refresh flow and the guard that redirects to sign-in. */
function isSessionExpiry(error: unknown) {
  return error instanceof ApiError && error.statusCode === 401;
}

/**
 * One place decides what the user is told after a request finishes. Pages
 * describe their outcome through `meta`; they do not call `toast` themselves
 * for reads and writes.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.meta?.silent || isSessionExpiry(error)) return;
            // Data already on screen is being refreshed. Nothing has been taken
            // away from the user, so a popup would only interrupt them.
            if (query.state.data !== undefined) return;
            toast.error(userMessageFor(error, query.meta?.errorMessage ?? LOAD_FAILED));
          },
        }),
        mutationCache: new MutationCache({
          onSuccess: (_data, _variables, _context, mutation) => {
            const message = mutation.meta?.successMessage;
            if (message) toast.success(message);
          },
          onError: (error, _variables, _context, mutation) => {
            if (mutation.meta?.silent || isSessionExpiry(error)) return;
            toast.error(userMessageFor(error, mutation.meta?.errorMessage ?? ACTION_FAILED));
          },
        }),
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
