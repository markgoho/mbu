import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { ApiError, apiFetchRaw } from '#lib/api.js';
import { apiErrorMessage } from '#lib/apiErrorMessage.js';
import { type AuthState, resolveAuth } from '#lib/auth.js';
import type { LayoutLoad } from './$types';

const SESSION_FAILED_MESSAGE = 'Could not check your sign-in. Please try again.';

/**
 * requireAuth: all routes in this group need a session, or a Firebase user whose
 * email waits for verification. A visitor with neither goes to `/sign-in`.
 *
 * The state is `data.auth`. The guards below read it with `await parent()`;
 * they do not read the session again.
 */
export const load: LayoutLoad = async (): Promise<{ auth: AuthState }> => {
  let auth: AuthState;
  try {
    auth = await resolveAuth(apiFetchRaw);
  } catch (authError) {
    error(
      authError instanceof ApiError ? authError.status : 503,
      apiErrorMessage(authError, SESSION_FAILED_MESSAGE),
    );
  }
  if (auth.status === 'signed-out') redirect(303, resolve('/(signed-out)/sign-in'));
  return { auth };
};
