import { ApiError } from '#lib/api.js';

/**
 * Returns the message to show for a failed API call: the `error` text of the
 * API error body, or `fallback` when there is none. When the body lists the
 * classes that caused a conflict (`details.classes`), their titles are appended
 * in parentheses. An error that is not an `ApiError` (a network failure, for
 * example) gives `fallback`.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) return fallback;

  const base = error.body?.error ?? fallback;
  const classes = error.body?.details?.classes;
  if (classes?.length) {
    return `${base} (${classes.map((conflictingClass) => conflictingClass.title).join(', ')})`;
  }
  return base;
}
