import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { getIdTokenResult } from 'firebase/auth';
import { getFirebaseAuth } from '#lib/firebase.js';
import type { LayoutLoad } from './$types';

/**
 * Reads the superAdmin custom claim from the ID token. It fails closed: no
 * user, no claim, or a token call that fails all give `false`.
 */
async function hasSuperAdminClaim(): Promise<boolean> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const result = await getIdTokenResult(user);
    return result.claims['superAdmin'] === true;
  } catch (error) {
    console.error('Failed to resolve superAdmin claim; treating user as non-super-admin:', error);
    return false;
  }
}

/**
 * requireSuperAdmin: all routes in this group need the superAdmin custom claim.
 * A user with no claim goes to the app home.
 *
 * The load reads the claim from the ID token. It does not read
 * `session.superAdmin`: that value is `false` until the claim resolves, so it
 * would refuse a super-admin on a hard refresh.
 */
export const load: LayoutLoad = async ({ parent }) => {
  await parent();
  if (!(await hasSuperAdminClaim())) redirect(303, resolve('/(authed)/(verified)/(app)'));
};
