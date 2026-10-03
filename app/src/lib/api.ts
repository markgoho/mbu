import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { signOut } from 'firebase/auth';
import type { ApiErrorBody } from '#lib/api-types/api-error.types.js';
import type { Fetcher } from '#lib/fetcher.js';
import { getFirebaseAuth } from '#lib/firebase.js';
import type { IdempotencyKeys } from '#lib/idempotency.js';

/**
 * Returns the request headers with the ID token of the signed-in user as a
 * Bearer credential. When no user is signed in, or the token call fails, the
 * headers stay as they are: the server then answers 401 if the path needs auth.
 * The token goes only to the API of the app (a path that starts with `/api/`),
 * never to a different origin.
 */
async function withIdToken(path: string, headersInit: HeadersInit | undefined): Promise<Headers> {
  const headers = new Headers(headersInit);
  if (!path.startsWith('/api/')) return headers;

  try {
    const token = await getFirebaseAuth().currentUser?.getIdToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } catch (error) {
    console.error('Failed to acquire auth token for request:', { path, error });
  }
  return headers;
}

async function fetchWithIdToken(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, { ...init, headers: await withIdToken(path, init.headers) });
}

/**
A 401 means that the server refused the token, so the client session ends too.
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
 * Fetches an `/api/*` path with the ID token of the signed-in user. This is the
 * `Fetcher` for components and event handlers.
 *
 * On a 401 response it signs the user out, goes to `/sign-in`, and then returns
 * the response. Do not use it in a `load`: `goto()` must not run there. Use
 * `apiFetchNoRedirect` in a `load`.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetchWithIdToken(path, init);
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
 * On a 401 response it signs the user out and returns the response. The `load`
 * then calls `redirect(303, '/sign-in')` itself. The sign-out is necessary: the
 * sign-in route sends a signed-in user away, which would cause a redirect loop.
 *
 * The `load` must `await getFirebaseAuth().authStateReady()` before the first
 * call (#228, decision 4). Before that, `currentUser` is not restored after a
 * reload: the request has no token, gets a 401, and the sign-out then removes
 * the stored session.
 */
export async function apiFetchNoRedirect(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetchWithIdToken(path, init);
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
