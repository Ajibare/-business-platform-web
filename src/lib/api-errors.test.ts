import { ApiError, NETWORK_ERROR_MESSAGE } from '@/services/api';
import { fieldIssuesFor, userMessageFor } from './api-errors';

describe('fieldIssuesFor', () => {
  it('returns one entry per field from a validation failure', () => {
    const error = new ApiError('Enter a valid email address.', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      field: 'email',
      details: [
        { field: 'email', message: 'Enter a valid email address.' },
        { field: 'name', message: 'Enter your full name.' },
      ],
    });

    expect(fieldIssuesFor(error)).toEqual([
      { field: 'email', message: 'Enter a valid email address.' },
      { field: 'name', message: 'Enter your full name.' },
    ]);
  });

  it('keeps the first message when the same field is reported twice', () => {
    const error = new ApiError('Too long.', {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [
        { field: 'password', message: 'Use 200 characters or fewer.' },
        { field: 'password', message: 'Include a number.' },
      ],
    });

    expect(fieldIssuesFor(error)).toEqual([
      { field: 'password', message: 'Use 200 characters or fewer.' },
    ]);
  });

  it('joins every unmet password rule into one message', () => {
    const error = new ApiError('Use at least 10 characters.', {
      statusCode: 400,
      code: 'WEAK_PASSWORD',
      field: 'password',
      details: { issues: ['Use at least 10 characters.', 'Include an uppercase letter.'] },
    });

    expect(fieldIssuesFor(error)).toEqual([
      {
        field: 'password',
        message: 'Use at least 10 characters. Include an uppercase letter.',
      },
    ]);
  });

  it('falls back to the single field the API highlighted', () => {
    const error = new ApiError('An account already exists for this email address.', {
      statusCode: 409,
      code: 'EMAIL_IN_USE',
      field: 'email',
    });

    expect(fieldIssuesFor(error)).toEqual([
      { field: 'email', message: 'An account already exists for this email address.' },
    ]);
  });

  it('reports nothing when the failure belongs to no field', () => {
    expect(fieldIssuesFor(new ApiError('Rate limited', { statusCode: 429 }))).toEqual([]);
  });
});

describe('userMessageFor', () => {
  const fallback = "We couldn't create your account right now. Please try again later.";

  it('keeps wording the API wrote for the user', () => {
    const error = new ApiError('An account already exists for this email address.', {
      statusCode: 409,
      code: 'EMAIL_IN_USE',
    });

    expect(userMessageFor(error, fallback)).toBe(
      'An account already exists for this email address.',
    );
  });

  it('replaces a 5xx body with the caller wording', () => {
    const error = new ApiError('We could not complete your request. Please try again later.', {
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    });

    expect(userMessageFor(error, fallback)).toBe(fallback);
  });

  it('replaces an unreachable database with the caller wording', () => {
    const error = new ApiError('The service is temporarily unavailable.', {
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
    });

    expect(userMessageFor(error, fallback)).toBe(fallback);
  });

  it('explains a transport failure', () => {
    const error = new ApiError(NETWORK_ERROR_MESSAGE, { code: 'NETWORK_ERROR' });

    expect(userMessageFor(error, fallback)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it('treats a non-API error as a transport failure', () => {
    expect(userMessageFor(new TypeError('Failed to fetch'), fallback)).toBe(NETWORK_ERROR_MESSAGE);
  });
});
