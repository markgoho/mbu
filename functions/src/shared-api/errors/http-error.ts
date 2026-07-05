/**
 * HTTP errors with status codes, thrown by services/routes and mapped to
 * responses by the shared Elysia `onError` handler.
 *
 * Ported from the doula-cooperative `functions` app, extended with an optional
 * machine-readable `code` so the client can branch on specific conditions
 * (e.g. EMAIL_NOT_VERIFIED) rather than string-matching messages.
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    /** Optional stable identifier for the client to branch on. */
    public readonly code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 401 Unauthorized — authentication is required or has failed. */
export class AuthError extends HttpError {
  constructor(message: string, code?: string) {
    super(message, 401, code);
  }
}

/** 403 Forbidden — authenticated but lacking permission for this action. */
export class ForbiddenError extends HttpError {
  constructor(message: string, code?: string) {
    super(message, 403, code);
  }
}

/** 404 Not Found — resource does not exist. */
export class NotFoundError extends HttpError {
  constructor(message: string, code?: string) {
    super(message, 404, code);
  }
}

/** 400 Bad Request — invalid input or validation failure. */
export class ValidationError extends HttpError {
  constructor(message: string, code?: string) {
    super(message, 400, code);
  }
}

/** 409 Conflict — resource conflict (already exists, concurrent modification). */
export class ConflictError extends HttpError {
  constructor(
    message: string,
    /** Optional structured payload (e.g. conflicting class ids). */
    public readonly details?: unknown,
    code?: string,
  ) {
    super(message, 409, code);
  }
}

/** Machine-readable error codes shared with the client. */
export const ERROR_CODES = {
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  CLASS_FULL: "class_full",
  PERIOD_CONFLICT: "period_conflict",
  EVENT_NOT_OPEN: "event_not_open",
  REGISTRATION_NOT_OPEN: "registration_not_open",
  REGISTRATION_CLOSED: "registration_closed",
  CONSENT_REQUIRED: "consent_required",
  CLOSE_EVENTS_FIRST: "close_events_first",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
