import type {
  BadgeCatalogResponse,
  UniversityDetailResponse,
} from '#lib/api-types/universities-api.types.js';
import { apiFetchNoRedirect } from '#lib/api.js';
import { failLoad } from '#lib/loadFailure.js';
import { getUniversity, listBadges } from '#lib/universities.js';
import type { PageLoad } from './$types';

/**
 * The university of the route with its periods and classes, and the badge
 * catalog for the class form. The two requests run at the same time.
 *
 * The API answers 403 for a university that the user does not own: the user
 * then goes to the dashboard, which shows the "denied" message. The page calls
 * `invalidateAll()` after each write, which runs this load again.
 */
export const load: PageLoad = async ({ parent, params }) => {
  await parent();

  let detail: UniversityDetailResponse;
  let catalog: BadgeCatalogResponse;
  try {
    [detail, catalog] = await Promise.all([
      getUniversity(apiFetchNoRedirect, params.id),
      listBadges(apiFetchNoRedirect),
    ]);
  } catch (loadError) {
    failLoad(loadError, { fallback: 'Could not load this university.', denied: 'university' });
  }
  return { university: detail.university, classes: detail.classes, badges: catalog.badges };
};
