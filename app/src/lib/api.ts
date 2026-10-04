import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { signOut } from 'firebase/auth';
import type { ApiErrorBody } from '#lib/api-types/api-error.types.js';
import type { Fetcher } from '#lib/fetcher.js';
import { getFirebaseAuth } from '#lib/firebase.js';
import type { IdempotencyKeys } from '#lib/idempotency.js';

/**
 * Fetches an `/api/*` path with no 401 handling. The browser sends the
 * `__session` cookie of the API with each same-origin request (ADR 0007), so no
 * request carries an `Authorization` header. Use it only where a 401 is an
 * ordinary answer: the session probe and the sign-in exchange in
 * `#lib/auth.js`, and sign-out. Other code uses `apiFetch` or
 * `apiFetchNoRedirect`.
 */
export function apiFetchRaw(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, { ...init, credentials: 'same-origin' });
}

/**
 * A 401 means that the session ended. A Firebase user that is still signed in
 * on the client (an email that waits for verification) is signed out too, so
 * the `(signed-out)` guard does not send the visitor back.
 */
async function signOutAfter401(): Promise<void> {
  try {
    await signOut(getFirebaseAuth());
  } catch (error) {
    console.error('Sign out after 401 failed:', error);
  }
}

// Some requests of one page can get a 401 at the same time. Only the first one
// signs out and navigates. This is a property of an object, not a module-level
// `let`, so that a write to it is not a reassignment of a binding.
const redirectGuard = { isRedirecting: false };

/**
 * Fetches an `/api/*` path with the session cookie. This is the `Fetcher` for
 * components and event handlers.
 *
 * On a 401 response it signs the user out, goes to `/sign-in`, and then returns
 * the response. Do not use it in a `load`: `goto()` must not run there. Use
 * `apiFetchNoRedirect` in a `load`.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await apiFetchRaw(path, init);
  if (response.status !== 401 || redirectGuard.isRedirecting) return response;

  redirectGuard.isRedirecting = true;
  try {
    await signOutAfter401();
    await goto(resolve('/(signed-out)/sign-in'));
  } catch (error) {
    // The caller gets the 401 response, not a navigation failure.
    console.error('Redirect to sign-in after 401 failed:', error);
  } finally {
    redirectGuard.isRedirecting = false;
  }
  return response;
}

/**
 * The same fetch as `apiFetch`, but it does not navigate. This is the `Fetcher`
 * for a `load` in `+layout.ts` / `+page.ts`.
 *
 * On a 401 response it signs the Firebase user out, if there is one, and
 * returns the response. The `load` then calls `redirect(303, '/sign-in')`
 * itself. The sign-out is necessary: the `(signed-out)` guard would exchange the
 * token of a signed-in Firebase user for a new session, and send the visitor
 * away again.
 */
export async function apiFetchNoRedirect(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await apiFetchRaw(path, init);
  if (response.status === 401) await signOutAfter401();
  return response;
}

/**
An API response that is not OK. `body` is the parsed JSON error body, if there is one.
*/
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | undefined;

  constructor(status: number, body: ApiErrorBody | undefined) {
    super(body?.message ?? `API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns the parsed JSON of an error response as an `ApiErrorBody`, or
 * `undefined` when it does not have that shape: `code` and `message` are text,
 * and `details`, if there is one, is an object of text values.
 */
export function readApiErrorBody(json: unknown): ApiErrorBody | undefined {
  if (!isObject(json)) return undefined;
  const { code, message, details } = json;
  if (typeof code !== 'string' || typeof message !== 'string') return undefined;
  if (details === undefined || details === null) return { code, message };
  if (!isObject(details) || Object.values(details).some((value) => typeof value !== 'string')) {
    return undefined;
  }
  return { code, message, details: details as Record<string, string> };
}

/**
 * Returns the response if it is OK. If not, throws an `ApiError`. Use it directly
 * for a call that has no response body (the 204 of a DELETE).
 */
export async function expectOk(response: Response): Promise<Response> {
  if (response.ok) return response;

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    // The body is empty or is not JSON (for example, an HTML page from a proxy).
  }
  throw new ApiError(response.status, readApiErrorBody(json));
}

/**
GETs a path and returns the parsed JSON body. Throws an `ApiError` if the response is not OK.
*/
export async function getJson<T>(fetcher: Fetcher, path: string): Promise<T> {
  const response = await expectOk(await fetcher(path));
  return (await response.json()) as T;
}

export interface SendOptions {
  /**
   * The `Idempotency-Key` header, for a `POST` that creates a record. Use
   * `createJson`, which gets the key from an `IdempotencyKeys`.
   */
  readonly idempotencyKey?: string;
}

/**
 * Sends a JSON body and returns the parsed JSON body of the response. Throws an
 * `ApiError` if the response is not OK.
 */
export async function sendJson<T>(
  fetcher: Fetcher,
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body: unknown,
  { idempotencyKey }: SendOptions = {},
): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (idempotencyKey !== undefined) headers.set('Idempotency-Key', idempotencyKey);
  const response = await expectOk(
    await fetcher(path, { method, headers, body: JSON.stringify(body) }),
  );
  return (await response.json()) as T;
}

/**
 * `POST`s a JSON body that creates a record, with an `Idempotency-Key` from
 * `keys` (`#lib/idempotency.js`): one key for each action of the user, and the
 * same key for a retry of that action. Returns the parsed JSON body of the
 * response. Throws an `ApiError` if the response is not OK.
 */
export function createJson<T>(
  fetcher: Fetcher,
  path: string,
  body: unknown,
  keys: IdempotencyKeys,
): Promise<T> {
  return keys.send({ path, body }, (idempotencyKey) =>
    sendJson<T>(fetcher, 'POST', path, body, { idempotencyKey }),
  );
}
