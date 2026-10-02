import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { getFirebaseAuth } from '#lib/firebase.js';
import type { LayoutLoad } from './$types';

/**
 * requireAuth: all routes in this group need a signed-in user. A visitor with
 * no session goes to `/sign-in`.
 *
 * The load waits for Firebase to restore a stored session first, so a hard
 * refresh on a guarded route does not send a signed-in user away.
 */
export const load: LayoutLoad = async () => {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  if (!auth.currentUser) redirect(303, resolve('/(signed-out)/sign-in'));
};
