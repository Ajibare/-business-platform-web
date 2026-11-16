import { clearSessionHint, markSessionActive } from '@/lib/session-hint';
import { clearExpiryAlertHints } from '@/lib/expiry-popup';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const API_ROOT = `${API_BASE_URL}/api/v1`;

/** Storage keys. The refresh token is never stored: it lives in an HttpOnly cookie. */
export const ACCESS_TOKEN_KEY = 'accessToken';
export const PROFILE_KEY = 'authProfile';

/** Fired when the session cannot be renewed, so the UI can send the user to sign in. */
export const SESSION_EXPIRED_EVENT = 'psi:session-expired';

export interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  code?: string;
  message?: string;
  /** Which form field the message belongs to, when the API knows. */
  field?: string;
  /** Structured, non-secret hints such as `{ attemptsRemaining: 4 }`. */
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly statusCode?: number;
  readonly field?: string;
  readonly details?: Record<string, unknown>;
  readonly retryAfterSeconds?: number;

  constructor(message: string, body: ApiErrorBody = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = body.code;
    this.statusCode = body.statusCode;
    this.field = body.field;
    this.details = body.details;
    this.retryAfterSeconds = body.retryAfterSeconds;
  }

  /** Reads a numeric hint out of `details`, for example `attemptsRemaining`. */
  detailNumber(key: string): number | undefined {
    const value = this.details?.[key];
    return typeof value === 'number' ? value : undefined;
  }
}

export interface ApiRequestOptions extends RequestInit {
  /** Send the request without the bearer token. */
  anonymous?: boolean;
  /** Do not try to renew an expired access token; used by the session endpoints. */
  skipRefresh?: boolean;
}

function readAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    // The router needs to know a session exists before any JavaScript runs, so
    // the hint is written whenever a token is.
    markSessionActive();
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    clearSessionHint();
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(PROFILE_KEY);
  clearSessionHint();
  // A new sign-in should show the expiry alert again.
  clearExpiryAlertHints();
}

/**
 * Endpoints whose 401 means "these credentials are wrong" rather than "this
 * token expired". Renewing and retrying them would either be pointless or, for
 * password reset, actively wrong.
 */
const NO_REFRESH_PREFIXES = [
  '/auth/sign-in',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/sign-out',
  '/auth/logout',
  '/auth/password/',
];

function shouldAttemptRefresh(path: string): boolean {
  return !NO_REFRESH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

async function send(path: string, init: RequestInit, anonymous: boolean): Promise<Response> {
  const accessToken = anonymous ? null : readAccessToken();
  return fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
    credentials: 'include',
  });
}

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Exchanges the HttpOnly refresh cookie for a new access token. Concurrent
 * callers share one request so a page that fires five queries at once does not
 * rotate the refresh token five times (which the API would treat as token
 * reuse and answer by ending every session).
 */
export function renewAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_ROOT}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) return null;
      const body = (await response.json().catch(() => null)) as { data?: AuthResultLike } | null;
      const token = body?.data?.accessToken ?? null;
      storeAccessToken(token);
      return token;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

interface AuthResultLike {
  accessToken?: string;
  profile?: unknown;
}

function notifySessionExpired(): void {
  clearStoredSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

function toApiError(body: unknown, status: number): ApiError {
  const payload = (body ?? {}) as ApiErrorBody;
  return new ApiError(payload.message ?? 'Request failed', {
    ...payload,
    statusCode: payload.statusCode ?? status,
  });
}

async function parseBody(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { anonymous = false, skipRefresh = false, ...init } = options;

  let response = await send(path, init, anonymous);

  if (response.status === 401 && !skipRefresh && shouldAttemptRefresh(path)) {
    const renewed = await renewAccessToken();
    if (renewed) {
      response = await send(path, init, false);
    } else {
      notifySessionExpired();
    }
  }

  const body = await parseBody(response);

  if (!response.ok) {
    throw toApiError(body, response.status);
  }

  const envelope = body as { data?: T } | null;
  if (!envelope || envelope.data === undefined) {
    return undefined as T;
  }

  return envelope.data;
}

/**
 * Fetches a server generated file (for example a CSV template or an import
 * error report). The API returns the file as text inside the standard
 * envelope so the download works with the same authentication as every other
 * request.
 */
export async function apiFetchFile(path: string): Promise<ApiFile> {
  return apiFetch<ApiFile>(path);
}

export interface ApiFile {
  filename: string;
  contentType: string;
  /** CSV text, or base64 when `encoding` is `base64`. */
  content: string;
  encoding?: 'text' | 'base64';
}
