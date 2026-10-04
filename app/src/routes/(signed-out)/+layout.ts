import { redirect } from '@sveltejs/kit';
import { apiFetchRaw } from '#lib/api.js';
import { type AuthState, resolveAuth } from '#lib/auth.js';
import { safeReturnTo } from '#lib/returnTo.js';
import type { LayoutLoad } from './$types';

/**
 * Reads the state of the visitor. When the API cannot answer, the visitor is
 * treated as signed out, so the sign-in page still shows.
 */
async function stateOrSignedOut(): Promise<AuthState> {
  try {
    return await resolveAuth(apiFetchRaw);
  } catch (error) {
    console.error('Could not read the session; showing the sign-in page:', error);
    return { status: 'signed-out' };
  }
}

/**
 * requireUnauth: the routes in this group are for a visitor with no session. A
 * signed-in user, or a user whose email waits for verification, goes to the
 * `returnTo` path of the URL, or to the app home. A user who has just signed in
 * with Firebase gets the session here (`resolveAuth`).
 *
 * The load reads `url`, so it runs again when the query changes. It also runs
 * again on `refreshAll()`, which is how a completed sign-in leaves this page
 * (see `#lib/session.svelte.js`).
 */
export const load: LayoutLoad = async ({ url }) => {
  const state = await stateOrSignedOut();
  if (state.status !== 'signed-out') redirect(303, safeReturnTo(url.searchParams));
};
