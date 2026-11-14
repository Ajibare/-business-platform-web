const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'include',
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error((body as { message?: string } | null)?.message ?? 'Request failed');
  }

  return (body as { data: T }).data;
}
