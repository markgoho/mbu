import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { LayoutLoad } from './$types';

/**
 * requireSuperAdmin: all routes in this group need the superAdmin claim. A user
 * with no claim goes to the app home.
 *
 * The load reads the claim from the session (`data.identity`): the API keeps
 * the claim that the ID token had at sign-in, and checks it again on each admin
 * request.
 */
export const load: LayoutLoad = async ({ parent }) => {
  const { identity } = await parent();
  if (!identity.superAdmin) redirect(303, resolve('/(authed)/(verified)/(app)'));
};
