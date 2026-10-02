import type { UniversityDetailResponse } from '#lib/api-types/universities-api.types.js';
import { apiFetchNoRedirect } from '#lib/api.js';
import { failLoad } from '#lib/loadFailure.js';
import { getUniversity } from '#lib/universities.js';
import type { PageLoad } from './$types';

/**
 * The university of the route with its classes, for the review of a super admin.
 *
 * The API lets a super admin read each university. It answers 403 when the
 * `superAdmin` claim was removed after the token was made: the user then goes
 * to the app home, as the `admin` guard does.
 */
export const load: PageLoad = async ({ parent, params }) => {
  await parent();

  let detail: UniversityDetailResponse;
  try {
    detail = await getUniversity(apiFetchNoRedirect, params.id);
  } catch (detailError) {
    failLoad(detailError, { fallback: 'Could not load this university.', forbidden: 'home' });
  }
  return { university: detail.university, classes: detail.classes };
};
