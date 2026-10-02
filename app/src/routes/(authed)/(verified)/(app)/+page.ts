import { apiFetchNoRedirect } from '#lib/api.js';
import { getHealth } from '#lib/health.js';
import type { PageLoad } from './$types';

/**
The status that the API reports, or `unavailable` when the health request fails.
*/
export type HealthStatus = 'ok' | 'unavailable';

/**
 * The health read of the app home. The load returns the promise and does not
 * await it, so the page renders at once and shows `loading…` until the API
 * answers. A request that fails gives `unavailable`: the promise never rejects,
 * so the home page stays and the error page does not replace it.
 */
export const load: PageLoad = async ({ parent }) => {
  await parent();

  return { health: readHealthStatus() };
};

async function readHealthStatus(): Promise<HealthStatus> {
  try {
    const health = await getHealth(apiFetchNoRedirect);
    return health.status;
  } catch {
    return 'unavailable';
  }
}
