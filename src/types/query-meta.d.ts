import '@tanstack/react-query';

/**
 * Every query and mutation may describe how it should be announced. The
 * caches in `QueryProvider` read these fields and nothing else, so no page
 * needs its own notification logic.
 */
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /** Shown if the request fails; `userMessageFor()` decides whether it is used. */
      errorMessage?: string;
      /** Set when the caller already renders the failure inline. */
      silent?: boolean;
    };
    mutationMeta: {
      /** Shown only after the server confirms the write. */
      successMessage?: string;
      errorMessage?: string;
      silent?: boolean;
    };
  }
}
