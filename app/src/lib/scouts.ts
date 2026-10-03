/**
 * The scouts API: the scout profiles of the signed-in parent.
 *
 * Each function is one request and takes the `Fetcher` first. A response that
 * is not OK throws an `ApiError`. The module keeps no state.
 */
import type {
  ScoutListResponse,
  ScoutRequest,
  ScoutResponse,
} from '#lib/api-types/users-api.types.js';
import { createJson, expectOk, getJson } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import type { IdempotencyKeys } from '#lib/idempotency.js';

const SCOUTS_PATH = '/api/users/me/scouts';

/**
`GET /api/users/me/scouts`: the scouts of the signed-in user.
*/
export function listScouts(fetcher: Fetcher): Promise<ScoutListResponse> {
  return getJson<ScoutListResponse>(fetcher, SCOUTS_PATH);
}

/**
`POST /api/users/me/scouts`, with an `Idempotency-Key` from `keys`.
*/
export function createScout(
  fetcher: Fetcher,
  body: ScoutRequest,
  keys: IdempotencyKeys,
): Promise<ScoutResponse> {
  return createJson<ScoutResponse>(fetcher, SCOUTS_PATH, body, keys);
}

/**
`DELETE /api/users/me/scouts/:scoutId`. The API answers 204.
*/
export async function removeScout(fetcher: Fetcher, scoutId: string): Promise<void> {
  await expectOk(await fetcher(`${SCOUTS_PATH}/${scoutId}`, { method: 'DELETE' }));
}
