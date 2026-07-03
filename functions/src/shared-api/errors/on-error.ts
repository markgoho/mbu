import { logger } from "firebase-functions/v2";
import { ERROR_IDS } from "../../constants/error-ids.js";
import { HttpError } from "./http-error.js";

interface OnErrorContext {
  /** Elysia error code — its own literals ("VALIDATION", …) or an HTTP number. */
  code: string | number;
  error: unknown;
  set: { status?: number | string };
}

/**
 * Shared Elysia `onError` handler. Maps thrown `HttpError`s to their status +
 * a `{ error, code }` body, Elysia validation failures to 400, and anything
 * else to a logged 500. Attach with `.onError(mapError)` on each API app.
 */
export function mapError({ code, error, set }: OnErrorContext) {
  if (error instanceof HttpError) {
    set.status = error.statusCode;
    return { error: error.message, code: error.code };
  }

  if (code === "VALIDATION") {
    set.status = 400;
    return {
      error: error instanceof Error ? error.message : "Invalid request",
    };
  }

  if (code === "NOT_FOUND") {
    set.status = 404;
    return { error: "Not found" };
  }

  logger.error("Unhandled route error", {
    errorId: ERROR_IDS.API_UNHANDLED_ROUTE_ERROR,
    code,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
  });
  set.status = 500;
  return { error: "Internal server error" };
}
