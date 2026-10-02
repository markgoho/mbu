import type { RosterResponse } from '#lib/api-types/registrations-api.types.js';
import { apiFetchNoRedirect } from '#lib/api.js';
import { failLoad } from '#lib/loadFailure.js';
import { getRoster } from '#lib/registrations.js';
import type { PageLoad } from './$types';

/**
 * The rosters of all classes of the university of the route.
 *
 * The API answers 403 for a user who is not the owner or a super admin: the
 * user then goes to the dashboard, which shows the "denied" message.
 */
export const load: PageLoad = async ({ parent, params }) => {
  await parent();

  let roster: RosterResponse;
  try {
    roster = await getRoster(apiFetchNoRedirect, params.id);
  } catch (rosterError) {
    failLoad(rosterError, { fallback: 'Could not load rosters for this event.', denied: 'roster' });
  }
  return { roster };
};
