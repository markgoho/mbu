import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import { ApiError, apiFetchNoRedirect } from '#lib/api.js';
import { apiErrorMessage } from '#lib/apiErrorMessage.js';
import { bootstrap, SESSION_DEPENDENCY } from '#lib/session.svelte.js';
import type { LayoutLoad } from './$types';

const BOOTSTRAP_FAILED_MESSAGE = 'Could not load your account. Please try again.';

/**
 * requireOnboarded: all routes in this group need an account that has accepted
 * the terms. The load bootstraps the account (`POST /api/users/me`). An account
 * that still needs consent goes to `/onboarding`.
 *
 * The bootstrap response is `data.session`. The pages in this group read the
 * account from `page.data.session` and do not make a second request.
 * `invalidate(SESSION_DEPENDENCY)` loads it again.
 *
 * `await parent()` makes this guard run after requireAuth and requireVerified:
 * the bootstrap needs the session that requireVerified checks.
 */
export const load: LayoutLoad = async ({ parent, depends }) => {
  await parent();
  depends(SESSION_DEPENDENCY);

  let session: BootstrapResponse;
  try {
    session = await bootstrap(apiFetchNoRedirect);
  } catch (bootstrapError) {
    // The session has ended (`apiFetchNoRedirect` has signed out a Firebase user, if any). A `load` redirects; it does not call `goto()`.
    if (bootstrapError instanceof ApiError && bootstrapError.status === 401) {
      redirect(303, resolve('/(signed-out)/sign-in'));
    }
    error(
      bootstrapError instanceof ApiError ? bootstrapError.status : 503,
      apiErrorMessage(bootstrapError, BOOTSTRAP_FAILED_MESSAGE),
    );
  }

  if (session.needsConsent) redirect(303, resolve('/(authed)/(verified)/onboarding'));
  return { session };
};
