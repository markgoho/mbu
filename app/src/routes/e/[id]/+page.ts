import type { PublicUniversity } from '#lib/api-types/universities-api.types.js';
import { ApiError, apiFetchNoRedirect } from '#lib/api.js';
import { getFirebaseAuth } from '#lib/firebase.js';
import { getPublicUniversity } from '#lib/universities.js';
import type { PageLoad } from './$types';

/**
Why the event did not load: it is missing or not published (`not-found`), or the request failed.
*/
export type EventLoadFailure = 'not-found' | 'failed';

/**
The event of the route, or the reason that there is none.
*/
export type PublicEventData =
  | { event: PublicUniversity; failure?: undefined }
  | { event: undefined; failure: EventLoadFailure };

/**
 * The parent-facing view of a published event. The route is public: it is in
 * no guard group, and the API does not ask for a token.
 *
 * The load does not throw and does not redirect. A failure is a value, so the
 * page shows its own "not found" or "failed" state, and a visitor with no
 * session is never sent to `/sign-in`. For this reason it does not use `failLoad`.
 *
 * It waits for Firebase first, so the request of a signed-in visitor has the
 * token (see `apiFetchNoRedirect`).
 */
export const load: PageLoad = async ({ params }): Promise<PublicEventData> => {
  await getFirebaseAuth().authStateReady();

  try {
    return { event: await getPublicUniversity(apiFetchNoRedirect, params.id) };
  } catch (eventError) {
    const isNotFound = eventError instanceof ApiError && eventError.status === 404;
    return { event: undefined, failure: isNotFound ? 'not-found' : 'failed' };
  }
};
