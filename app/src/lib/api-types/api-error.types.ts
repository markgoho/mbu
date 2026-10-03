/**
 * The error body of each API route (`api/internal/apierr`, api-design.md
 * section 7): `{ code, message, details? }`.
 */

/**
 * The codes of `api/internal/apierr`. The app compares a code with one of
 * these, never with the `message`. A server can send a code that is not in
 * this list (a newer server): `ApiErrorBody.code` is then a plain string.
 */
export type ApiErrorCode =
  | 'INVALID_ARGUMENT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FAILED_PRECONDITION'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'PAYLOAD_TOO_LARGE'
  | 'EMAIL_NOT_VERIFIED'
  | 'CLASS_FULL'
  | 'PERIOD_CONFLICT'
  | 'EVENT_NOT_OPEN'
  | 'REGISTRATION_NOT_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'CONSENT_REQUIRED'
  | 'CLOSE_EVENTS_FIRST'
  | 'IDEMPOTENCY_KEY_REUSED';

export interface ApiErrorBody {
  /**
  An `ApiErrorCode`, or a code that this app does not know.
  */
  code: string;
  /**
  The text for a person.
  */
  message: string;
  /**
   * For `INVALID_ARGUMENT`: the message of each field at fault, keyed by the
   * JSON name of the field (`location.city` for a nested field). For the 409
   * `PERIOD_CONFLICT` and the 409 `CONFLICT` of a period that a class uses:
   * the badge title of each class at fault, keyed by the class ID.
   */
  details?: Readonly<Record<string, string>>;
}
