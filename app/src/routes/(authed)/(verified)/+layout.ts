import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { SessionResponse } from '#lib/api-types/session-api.types.js';
import type { LayoutLoad } from './$types';

/**
 * requireVerified: all routes in this group need a session. The API makes one
 * only for a verified email, so a user without one (an email that waits for
 * verification) goes to `/verify-email`.
 *
 * The signed-in adult is `data.identity`.
 *
 * SvelteKit runs the layout loads of a route at the same time. `await parent()`
 * makes this guard run after requireAuth, so the redirects have a fixed order.
 */
export const load: LayoutLoad = async ({ parent }): Promise<{ identity: SessionResponse }> => {
  const { auth } = await parent();
  if (auth.status !== 'signed-in') redirect(303, resolve('/(authed)/verify-email'));
  return { identity: auth.session };
};
