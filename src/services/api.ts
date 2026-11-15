const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ApiErrorBody {
  statusCode?: number;
  error?: string;
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken =
    typeof window !== 'undefined' ? window.localStorage.getItem('accessToken') : null;

  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  });

  const body = (await response.json().catch(() => null)) as
    | ApiErrorBody
    | { data: T }
    | null;

  if (!response.ok) {
    const errorBody = (body ?? {}) as ApiErrorBody;
    throw new ApiError(
      errorBody.message ?? 'Request failed',
      errorBody.code,
      response.status,
    );
  }

  const responseBody = body as { data: T };
  if (!responseBody || responseBody.data === undefined) {
    return undefined as T;
  }

  return responseBody.data;
}
