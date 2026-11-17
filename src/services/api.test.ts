import { ApiError, NETWORK_ERROR_MESSAGE, apiFetch } from './api';

const originalFetch = global.fetch;

/** Runs a request that is expected to fail and hands back the thrown ApiError. */
async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((thrown: unknown) => thrown);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('apiFetch', () => {
  it('turns a transport failure into an ApiError instead of a raw TypeError', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as never;

    const error = await failureOf(
      apiFetch('/auth/register', { method: 'POST', anonymous: true, body: '{}' }),
    );

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('keeps the API code, field and per-field details', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        statusCode: 400,
        error: 'Bad Request',
        code: 'VALIDATION_ERROR',
        message: 'Enter a valid email address.',
        field: 'email',
        requestId: 'req-1',
        details: [{ field: 'email', message: 'Enter a valid email address.' }],
      }),
    }) as never;

    const error = await failureOf(
      apiFetch('/auth/register', { method: 'POST', anonymous: true, body: '{}' }),
    );

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.requestId).toBe('req-1');
    expect(error.fieldIssues).toEqual([{ field: 'email', message: 'Enter a valid email address.' }]);
    // `details` is an array here, so numeric hints must resolve to undefined.
    expect(error.detailNumber('attemptsRemaining')).toBeUndefined();
  });

  it('reads a numeric hint from an object-shaped details payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        statusCode: 400,
        code: 'INVALID_CODE',
        message: 'That code is not correct.',
        details: { attemptsRemaining: 3 },
      }),
    }) as never;

    const error = await failureOf(
      apiFetch('/auth/register/verify', { method: 'POST', anonymous: true, body: '{}' }),
    );

    expect(error.detailNumber('attemptsRemaining')).toBe(3);
    expect(error.fieldIssues).toEqual([]);
  });

  it('unwraps the data envelope on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ data: { verificationRequired: true } }),
    }) as never;

    await expect(
      apiFetch('/auth/register', { method: 'POST', anonymous: true, body: '{}' }),
    ).resolves.toEqual({ verificationRequired: true });
  });
});
