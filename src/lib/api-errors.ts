import { ApiError, NETWORK_ERROR_MESSAGE } from '@/services/api';

export { NETWORK_ERROR_MESSAGE };

/** A message the API attached to one request field. */
export interface FieldIssue {
  field: string;
  message: string;
}

/**
 * The messages the API attached to individual inputs.
 *
 * Three shapes arrive in practice: the per-field list from a validation
 * failure, the unmet rules of a rejected password, and the single `field` the
 * API highlights. All three are folded into one list, one message per field.
 */
export function fieldIssuesFor(error: ApiError): FieldIssue[] {
  const issues = error.fieldIssues.length > 0 ? error.fieldIssues : passwordIssues(error);

  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (!issue.field || seen.has(issue.field)) return false;
    seen.add(issue.field);
    return true;
  });
}

function passwordIssues(error: ApiError): FieldIssue[] {
  // A rejected password carries every unmet rule; showing them together tells
  // the user what to change instead of revealing one requirement at a time.
  const rules = error.detailStrings('issues');
  if (rules.length > 0) {
    return [{ field: error.field ?? 'password', message: rules.join(' ') }];
  }
  return error.field ? [{ field: error.field, message: error.message }] : [];
}

/**
 * Copy for a failure the API could not describe in words a user can act on.
 *
 * A 4xx body already carries wording written for the person filling the form,
 * so it is shown as-is. Transport failures and 5xx responses are replaced with
 * the caller's own sentence: those bodies are generic or, worse, technical.
 */
export function userMessageFor(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE;
  if (error.code === 'NETWORK_ERROR') return NETWORK_ERROR_MESSAGE;
  if (error.statusCode !== undefined && error.statusCode >= 500) return fallback;
  return error.message || fallback;
}
