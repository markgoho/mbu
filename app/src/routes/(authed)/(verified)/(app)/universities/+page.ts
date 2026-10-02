import type { UniversityListResponse } from '#lib/api-types/universities-api.types.js';
import { apiFetchNoRedirect } from '#lib/api.js';
import { DENIED_PARAMETER, deniedMessage, failLoad } from '#lib/loadFailure.js';
import { listMine } from '#lib/universities.js';
import type { PageLoad } from './$types';

/**
 * The universities of the signed-in chancellor.
 *
 * `deniedMessage` is the message for a user that a different `load` sent here
 * after a 403 (`?denied=university` from the editor, `?denied=roster` from the
 * rosters). The page removes the query parameter when the user dismisses it.
 */
export const load: PageLoad = async ({ parent, url }) => {
  await parent();

  let universityList: UniversityListResponse;
  try {
    universityList = await listMine(apiFetchNoRedirect);
  } catch (listError) {
    failLoad(listError, { fallback: 'Could not load your universities.' });
  }
  return {
    universities: universityList.universities,
    deniedMessage: deniedMessage(url.searchParams.get(DENIED_PARAMETER)),
  };
};
