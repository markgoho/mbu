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
import { expectOk, getJson, sendJson } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';

const SCOUTS_PATH = '/api/users/me/scouts';

/**
`GET /api/users/me/scouts`: the scouts of the signed-in user.
*/
export function listScouts(fetcher: Fetcher): Promise<ScoutListResponse> {
  return getJson<ScoutListResponse>(fetcher, SCOUTS_PATH);
}

/**
`POST /api/users/me/scouts`.
*/
export function createScout(fetcher: Fetcher, body: ScoutRequest): Promise<ScoutResponse> {
  return sendJson<ScoutResponse>(fetcher, 'POST', SCOUTS_PATH, body);
}

/**
`DELETE /api/users/me/scouts/:scoutId`. The API answers 204.
*/
export async function removeScout(fetcher: Fetcher, scoutId: string): Promise<void> {
  await expectOk(await fetcher(`${SCOUTS_PATH}/${scoutId}`, { method: 'DELETE' }));
}
