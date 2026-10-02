import { redirect } from '@sveltejs/kit';
import { getFirebaseAuth } from '#lib/firebase.js';
import { safeReturnTo } from '#lib/returnTo.js';
import type { LayoutLoad } from './$types';

/**
 * requireUnauth: the routes in this group are for a visitor with no session. A
 * signed-in user goes to the `returnTo` path of the URL, or to the app home.
 *
 * The load reads `url`, so it runs again when the query changes. It also runs
 * again on `invalidateAll()`, which is how a completed sign-in leaves this page
 * (see `#lib/session.svelte.js`).
 */
export const load: LayoutLoad = async ({ url }) => {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  if (auth.currentUser) redirect(303, safeReturnTo(url.searchParams));
};
