import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { getFirebaseAuth } from '#lib/firebase.js';
import type { LayoutLoad } from './$types';

/**
 * requireVerified: all routes in this group need a verified email. A user with
 * an email that is not verified goes to `/verify-email`.
 *
 * SvelteKit runs the layout loads of a route at the same time. `await parent()`
 * makes this guard run after requireAuth, so the redirects have a fixed order.
 */
export const load: LayoutLoad = async ({ parent }) => {
  await parent();

  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) redirect(303, resolve('/(signed-out)/sign-in'));
  if (!user.emailVerified) redirect(303, resolve('/(authed)/verify-email'));
};
