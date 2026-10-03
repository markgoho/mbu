/**
 * The readers of a failed API call (an `ApiError` from `#lib/api.js`): the
 * text to show, the messages of the fields, and a test of the code.
 */
import type { ApiErrorCode } from '#lib/api-types/api-error.types.js';
import { ApiError } from '#lib/api.js';

/**
 * The text of the app for a code whose message from the API is not for a
 * person (`INTERNAL` uses the fallback of the call), or that needs words of
 * this app.
 */
const APP_MESSAGES: ReadonlyMap<string, string> = new Map<ApiErrorCode, string>([
  ['RATE_LIMITED', 'Too many requests. Wait a minute, then try again.'],
  [
    'IDEMPOTENCY_KEY_REUSED',
    'The request was sent again with different values. Reload the page, then try again.',
  ],
  [
    'FAILED_PRECONDITION',
    'The university cannot make that change in its current status. Reload the page to see its status.',
  ],
]);

/**
The codes whose `details` hold the badge title of each class at fault, keyed by the class ID.
*/
const CLASS_DETAILS_CODES: ReadonlySet<string> = new Set<ApiErrorCode>([
  'PERIOD_CONFLICT',
  'CONFLICT',
]);

/**
True when `error` is an `ApiError` with the code `code`.
*/
export function hasCode(error: unknown, code: ApiErrorCode): boolean {
  return error instanceof ApiError && error.body?.code === code;
}

/**
 * Returns the message to show for a failed API call: the `message` of the API
 * error body, or `fallback` when there is none. `INTERNAL` gives `fallback`,
 * and some codes give a text of the app (`APP_MESSAGES`). When a conflict names
 * the classes at fault (`PERIOD_CONFLICT`, or the `CONFLICT` of a period that a
 * class uses), their badge titles are appended in parentheses. An error that is
 * not an `ApiError` (a network failure, for example) gives `fallback`.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError) || !error.body) return fallback;

  const { code, message, details } = error.body;
  if (code === 'INTERNAL') return fallback;
  const appMessage = APP_MESSAGES.get(code);
  if (appMessage) return appMessage;

  const titles = CLASS_DETAILS_CODES.has(code) ? Object.values(details ?? {}) : [];
  return titles.length > 0 ? `${message} (${titles.join(', ')})` : message;
}

/**
 * Returns the message of each field at fault of an `INVALID_ARGUMENT` refusal,
 * keyed by the JSON name of the field (`location.city` for a nested field).
 * Any other failure gives no field messages.
 */
export function apiFieldErrors(error: unknown): Readonly<Record<string, string>> {
  return hasCode(error, 'INVALID_ARGUMENT') && error instanceof ApiError
    ? (error.body?.details ?? {})
    : {};
}
