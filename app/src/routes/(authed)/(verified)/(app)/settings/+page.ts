import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { ScoutListResponse } from '#lib/api-types/users-api.types.js';
import { ApiError, apiFetchNoRedirect } from '#lib/api.js';
import { apiErrorMessage } from '#lib/apiErrorMessage.js';
import { listScouts } from '#lib/scouts.js';
import type { PageLoad } from './$types';

const LOAD_FAILED_MESSAGE = 'Could not load your scouts. Please try again.';

/**
 * The scouts of the signed-in user. The page deletes a scout and then calls
 * `refreshAll()`, which runs this load again.
 */
export const load: PageLoad = async ({ parent }) => {
  await parent();

  let scoutList: ScoutListResponse;
  try {
    scoutList = await listScouts(apiFetchNoRedirect);
  } catch (listError) {
    // `apiFetchNoRedirect` has signed the user out. A `load` redirects; it does not call `goto()`.
    if (listError instanceof ApiError && listError.status === 401) {
      redirect(303, resolve('/(signed-out)/sign-in'));
    }
    error(
      listError instanceof ApiError ? listError.status : 503,
      apiErrorMessage(listError, LOAD_FAILED_MESSAGE),
    );
  }
  return { scouts: scoutList.scouts };
};
