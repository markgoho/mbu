/**
 * The session of the signed-in user: the reactive Firebase user, and the
 * functions that change the session. All routes and components use this module
 * for auth. They do not call the Firebase Auth SDK themselves. The guard loads
 * are the exception: they read `getFirebaseAuth().currentUser` and the claims.
 *
 * Rules for the callers:
 *
 * - The functions that change who is signed in, or the state of the user
 *   (sign-in, sign-up, a completed Google redirect, `reloadUser`, `signOut`),
 *   invalidate all `load` data themselves. The guard loads then run again, so
 *   data of the previous user or state is not reused. On the sign-in page, this
 *   is also what sends the user to `returnTo`: the `(signed-out)` guard runs
 *   again and redirects. A caller does not need its own `invalidateAll()`.
 * - `session.user` is reactive. A page under the `(app)` group reads the account
 *   (`BootstrapResponse`) from `page.data.session`, not from this module.
 * - The route guards do not read `session.superAdmin`. It is `false` until the
 *   claim resolves. The `admin` guard reads the claim from the ID token.
 */
import { goto, invalidate, invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  getRedirectResult,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import type {
  BootstrapResponse,
  OnboardingRequest,
  UserResponse,
} from '#lib/api-types/users-api.types.js';
import { expectOk, sendJson } from '#lib/api.js';
import { authErrorCode, authErrorMessage } from '#lib/authErrorMessage.js';
import type { Fetcher } from '#lib/fetcher.js';
import { getFirebaseAuth } from '#lib/firebase.js';

export { AUTH_ERROR_MESSAGES } from '#lib/authErrorMessage.js';

/**
 * The `depends()` key of the `(app)` layout load, which gives `data.session`.
 * `invalidate(SESSION_DEPENDENCY)` makes that load bootstrap the account again.
 */
export const SESSION_DEPENDENCY = 'app:session';

// The last event of the ID token listener. `undefined` means that no event has
// arrived yet. Each event makes a new wrapper object, because Firebase gives the
// same `User` object again after a token refresh and changes it in place: with
// the bare `User` in the state, `emailVerified` would not update.
let lastTokenEvent = $state.raw<{ user: User | undefined }>();

/**
 * Reads the user from the last token event, so the caller depends on each
 * event. This is not a `$derived`: a derived value that gives the same `User`
 * object again does not tell its readers that the fields of the object changed.
 *
 * Before the first event, the user is the one that Firebase has now. A guard
 * load has already awaited `authStateReady()` when a page reads this, so the
 * first render of a page has the user.
 */
function currentUser(): User | undefined {
  return lastTokenEvent ? lastTokenEvent.user : (getFirebaseAuth().currentUser ?? undefined);
}

const isEmailVerified = $derived(currentUser()?.emailVerified ?? false);

// The superAdmin custom claim of the ID token. It fails closed: it is `false`
// while the claim resolves and when the token call fails.
let isSuperAdmin = $state(false);

async function resolveSuperAdmin(tokenEvent: { user: User | undefined }): Promise<void> {
  let hasClaim = false;
  if (tokenEvent.user) {
    try {
      const result = await getIdTokenResult(tokenEvent.user);
      hasClaim = result.claims['superAdmin'] === true;
    } catch (error) {
      console.error('Failed to resolve superAdmin claim; treating user as non-super-admin:', error);
    }
  }
  // A newer event owns the value now.
  if (lastTokenEvent === tokenEvent) isSuperAdmin = hasClaim;
}

// Not reactive: it only records that the listener exists.
let isSubscribed = false;

/**
 * Subscribes to the ID token one time, at the first read of the session. The
 * listener stays for the life of the app. `onIdTokenChanged` also fires on a
 * token refresh, not only on sign-in and sign-out, so `emailVerified` and the
 * claims stay current. Firebase calls the listener asynchronously, so this does
 * not write state during the read that starts it.
 */
function subscribe(): void {
  if (isSubscribed) return;
  isSubscribed = true;

  onIdTokenChanged(
    getFirebaseAuth(),
    (nextUser) => {
      const tokenEvent = { user: nextUser ?? undefined };
      // The claim of a different user must not stay while the new one resolves.
      if (tokenEvent.user?.uid !== currentUser()?.uid) isSuperAdmin = false;
      lastTokenEvent = tokenEvent;
      void resolveSuperAdmin(tokenEvent);
    },
    (error) => console.error('Auth ID token listener error:', error),
  );
}

/**
 * The reactive session state. Read the properties where the value is used: in a
 * template, or in the expression of a `$derived` (`$derived(session.user?.email)`).
 * Do not keep the `User` object itself in a `$derived`: Firebase gives the same
 * object again after a token refresh, so the readers of that value get no update.
 */
export const session = {
  /**
  The signed-in Firebase user, or `undefined` when no user is signed in.
  */
  get user(): User | undefined {
    subscribe();
    return currentUser();
  },
  get emailVerified(): boolean {
    subscribe();
    return isEmailVerified;
  },
  /**
  `true` only when the ID token has the superAdmin claim. Not for route guards.
  */
  get superAdmin(): boolean {
    subscribe();
    return isSuperAdmin;
  },
};

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
 * The API refuses a user with an email that is not verified (403).
 */
export async function bootstrap(fetcher: Fetcher): Promise<BootstrapResponse> {
  return sendJson<BootstrapResponse>(fetcher, 'POST', '/api/users/me', {});
}

/**
 * Saves the name and the acceptance of the Terms and the Privacy Policy
 * (`PATCH /api/users/me`). The caller then goes to a route of the `(app)` group
 * with `invalidateAll`, so that the `(app)` guard bootstraps the account again.
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
  if (credential) await invalidateAll();
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
  await invalidateAll();
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
  await invalidateAll();
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
 * Reloads the signed-in user (to get a new `emailVerified` value), and then
 * forces a token refresh, so that the token listener fires and the API gets a
 * token with the new value.
 */
export async function reloadUser(): Promise<void> {
  const current = getFirebaseAuth().currentUser;
  if (!current) return;
  try {
    await current.reload();
    await current.getIdToken(true);
  } catch (error) {
    console.error('Error reloading user:', error);
    // Firebase signs the user out when the token is not valid, so the guards run again here too.
    await invalidateAll();
    throw new Error('Failed to reload user data.', { cause: error });
  }
  await invalidateAll();
}

/**
Signs the user out and goes to `/sign-in`.
*/
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out failed:', {
      uid: auth.currentUser?.uid,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error('Failed to sign out. Please try again.', { cause: error });
  }
  await goto(resolve('/(signed-out)/sign-in'), { invalidateAll: true });
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
