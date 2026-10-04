/**
 * The functions that change the session of the user. All routes and components
 * use this module for auth. They do not call the Firebase Auth SDK themselves.
 * The route guards read the state of the visitor with `resolveAuth` from
 * `#lib/auth.js`, which owns the exchange of the Firebase ID token for the
 * session cookie of the API (ADR 0007 in `api/docs/adr/`).
 *
 * Rules for the callers:
 *
 * - The functions that change who is signed in, or the state of the user
 *   (sign-in, sign-up, a completed Google redirect, `isEmailVerifiedAfterReload`, `signOut`),
 *   invalidate all `load` data themselves. The guard loads then run again: they
 *   make the session, and data of the previous user or state is not reused. On
 *   the sign-in page, this is also what sends the user to `returnTo`: the
 *   `(signed-out)` guard runs again and redirects. A caller does not need its
 *   own `refreshAll()`.
 * - A page reads the signed-in adult from its `data`: `data.auth` under
 *   `(authed)`, `data.identity` under `(verified)`, and the account
 *   (`BootstrapResponse`) from `data.session` under `(app)`.
 */
import { goto, invalidate, refreshAll } from '$app/navigation';
import { resolve } from '$app/paths';
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type UserCredential,
} from 'firebase/auth';
import type {
  BootstrapResponse,
  OnboardingRequest,
  UserResponse,
} from '#lib/api-types/users-api.types.js';
import { apiFetchRaw, expectOk, sendJson } from '#lib/api.js';
import { authErrorCode, authErrorMessage } from '#lib/authErrorMessage.js';
import type { Fetcher } from '#lib/fetcher.js';
import { getFirebaseAuth } from '#lib/firebase.js';

export { AUTH_ERROR_MESSAGES } from '#lib/authErrorMessage.js';

/**
 * The `depends()` key of the `(app)` layout load, which gives `data.session`.
 * `invalidate(SESSION_DEPENDENCY)` makes that load bootstrap the account again.
 */
export const SESSION_DEPENDENCY = 'app:session';

/**
Logs a failed call of the Firebase Auth SDK and returns an error with the message to show.
*/
function translateAuthError(
  error: unknown,
  method: string,
  context: Record<string, unknown> = {},
): Error {
  console.error(`session.${method} failed:`, {
    method,
    errorCode: authErrorCode(error),
    error: error instanceof Error ? error.message : String(error),
    ...context,
  });
  return new Error(authErrorMessage(error), { cause: error });
}

/**
The address that the link in the verification email opens.
*/
function verificationContinueUrl(): string {
  return `${location.origin}${resolve('/(authed)/(verified)/onboarding')}`;
}

/**
 * Bootstraps the account on the backend (`POST /api/users/me`) and returns it.
 * It needs a session (401 without one).
 */
export async function bootstrap(fetcher: Fetcher): Promise<BootstrapResponse> {
  return sendJson<BootstrapResponse>(fetcher, 'POST', '/api/users/me', {});
}

/**
 * Saves the name and the acceptance of the Terms and the Privacy Policy
 * (`PATCH /api/users/me`). The caller then goes to a route of the `(app)` group
 * with `refreshAll`, so that the `(app)` guard bootstraps the account again.
 */
export async function completeOnboarding(
  fetcher: Fetcher,
  request: OnboardingRequest,
): Promise<UserResponse> {
  return sendJson<UserResponse>(fetcher, 'PATCH', '/api/users/me', request);
}

/**
 * Starts the Google sign-in. It uses the redirect flow, not a popup: the popup
 * flow causes a Cross-Origin-Opener-Policy warning when the SDK closes the
 * popup. The browser goes to Google, so do not expect this to resolve. The
 * sign-in is complete on the page load after the redirect back.
 */
export async function signInWithGoogle(): Promise<void> {
  try {
    await signInWithRedirect(getFirebaseAuth(), new GoogleAuthProvider());
  } catch (error) {
    throw translateAuthError(error, 'signInWithGoogle');
  }
}

/**
 * Gets the result of a Google redirect sign-in after the redirect back, if one
 * is in progress. The result is `undefined` when there is none.
 */
export async function completeGoogleRedirect(): Promise<UserCredential | undefined> {
  let credential: UserCredential | undefined;
  try {
    credential = (await getRedirectResult(getFirebaseAuth())) ?? undefined;
  } catch (error) {
    throw translateAuthError(error, 'completeGoogleRedirect');
  }
  if (credential) await refreshAll();
  return credential;
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<UserCredential> {
  let credential: UserCredential;
  try {
    credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  } catch (error) {
    throw translateAuthError(error, 'signInWithEmailPassword');
  }
  await refreshAll();
  return credential;
}

/**
Makes the account, signs the user in, and sends the verification email.
*/
export async function signUpWithEmailPassword(
  email: string,
  password: string,
): Promise<UserCredential> {
  let credential: UserCredential;
  try {
    credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  } catch (error) {
    throw translateAuthError(error, 'signUpWithEmailPassword');
  }

  // The account exists and the user is signed in now. A verification email
  // that fails must not stop the sign-up: a second try would give
  // `auth/email-already-in-use`. The verify-email page can send the email again.
  try {
    await sendEmailVerification(credential.user, { url: verificationContinueUrl() });
  } catch (error) {
    console.error('session.signUpWithEmailPassword: the verification email failed:', {
      uid: credential.user.uid,
      errorCode: authErrorCode(error),
    });
  }
  await refreshAll();
  return credential;
}

export async function resendEmailVerification(): Promise<void> {
  const current = getFirebaseAuth().currentUser;
  if (!current) throw new Error('No authenticated user');
  try {
    await sendEmailVerification(current, { url: verificationContinueUrl() });
  } catch (error) {
    throw translateAuthError(error, 'resendEmailVerification', { uid: current.uid });
  }
}

/**
 * Reloads the Firebase user (to get a new `emailVerified` value) and gets a new
 * ID token, then invalidates all `load` data: with a verified email, the guards
 * exchange the token for a session. Returns `true` when the email is verified.
 */
export async function isEmailVerifiedAfterReload(): Promise<boolean> {
  const current = getFirebaseAuth().currentUser;
  if (!current) return false;
  try {
    await current.reload();
    await current.getIdToken(true);
  } catch (error) {
    console.error('Error reloading user:', error);
    // Firebase signs the user out when the token is not valid, so the guards run again here too.
    await refreshAll();
    throw new Error('Failed to reload user data.', { cause: error });
  }
  const isVerified = current.emailVerified;
  await refreshAll();
  return isVerified;
}

const SIGN_OUT_FAILED_MESSAGE = 'Failed to sign out. Please try again.';

/**
 * Ends the session (`DELETE /api/session`), signs the Firebase SDK out if it has
 * a user, and goes to `/sign-in`. When the API cannot be reached, the session
 * is still in place: the function throws, so the page can say so.
 */
export async function signOut(): Promise<void> {
  let response: Response;
  try {
    response = await apiFetchRaw('/api/session', { method: 'DELETE' });
  } catch (error) {
    console.error('Sign out failed:', error);
    throw new Error(SIGN_OUT_FAILED_MESSAGE, { cause: error });
  }
  if (!response.ok) {
    console.error('Sign out failed:', { status: response.status });
    throw new Error(SIGN_OUT_FAILED_MESSAGE);
  }

  const auth = getFirebaseAuth();
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    // The session has ended. A Firebase user with no session has no access to the API.
    console.error('Sign out of the Firebase SDK failed:', error);
  }
  await goto(resolve('/(signed-out)/sign-in'), { refreshAll: true });
}

/**
Right to erasure: deletes the account on the backend, and then signs the user out.
*/
export async function deleteAccount(fetcher: Fetcher): Promise<void> {
  await expectOk(await fetcher('/api/users/me', { method: 'DELETE' }));
  await signOut();
}

/**
 * Records the one-time roster-export acknowledgment, and then loads
 * `page.data.session` again, so that it has the new `rosterExportAckAt`.
 */
export async function ackRosterExport(fetcher: Fetcher): Promise<void> {
  await sendJson<UserResponse>(fetcher, 'POST', '/api/users/me/roster-export-ack', {});
  await invalidate(SESSION_DEPENDENCY);
}
