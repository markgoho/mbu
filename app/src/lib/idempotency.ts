/**
 * The `Idempotency-Key` of a `POST` that creates a record (api-design.md
 * section 3).
 *
 * The API stores the answer of a key for 48 hours: a 2xx or a 4xx. A second
 * request with the same key gets that stored answer again, and a key that
 * comes again with a different request gets `409 IDEMPOTENCY_KEY_REUSED`. A
 * 5xx is not stored.
 *
 * Thus one action of the user gets one key, and a retry of that action sends
 * the same key: a key is used again only for the same request (the same path
 * and body) after a send that got no stored answer (a network failure or a
 * 5xx). After a 2xx or a 4xx, the next send of that request is a new action
 * and gets a new key. For example, a `POST` before the session bootstrap gets a
 * 404 that the API stores, so the send after the bootstrap needs a new key.
 */
import { ApiError } from '#lib/api.js';

const FIRST_SERVER_ERROR_STATUS = 500;

/**
True when the API did not store an answer for the key: there was no answer, or it was a 5xx.
*/
function isUnstored(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= FIRST_SERVER_ERROR_STATUS;
}

/**
 * The keys of the create requests of one page. Make one instance for each
 * page (a plain `const`, not `$state`).
 */
export class IdempotencyKeys {
  // The key of each request whose last send got no stored answer, keyed by the JSON of the request.
  readonly #retryKeys = new Map<string, string>();

  /**
   * Calls `send` with the key for `request` and returns its result. `request`
   * identifies the request: give the path and the body (`{ path, body }`).
   */
  async send<T>(request: unknown, send: (idempotencyKey: string) => Promise<T>): Promise<T> {
    const identity = JSON.stringify(request);
    const key = this.#retryKeys.get(identity) ?? crypto.randomUUID();
    this.#retryKeys.set(identity, key);
    try {
      const result = await send(key);
      this.#retryKeys.delete(identity);
      return result;
    } catch (error) {
      if (!isUnstored(error)) this.#retryKeys.delete(identity);
      throw error;
    }
  }
}
