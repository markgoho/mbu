/**
 * Who is signed in, for the route guards (ADR 0007 in `api/docs/adr/`). The API
 * owns the session: an HttpOnly `__session` cookie that JavaScript cannot read.
 * The Firebase Auth SDK only signs the user in. Its ID token goes to the API one
 * time, in the body of `POST /api/session`, and the SDK then signs out.
 *
 * The one exception is an account with an email that is not verified. The API
 * gives it no session, and the SDK keeps its user, because the verify-email page
 * needs it to send the email again and to reload the user.
 */
import { signOut } from 'firebase/auth';
import type { CreateSessionRequest, SessionResponse } from '#lib/api-types/session-api.types.js';
import { ApiError, expectOk, sendJson } from '#lib/api.js';
import { hasCode } from '#lib/apiErrorMessage.js';
import type { Fetcher } from '#lib/fetcher.js';
import { getFirebaseAuth } from '#lib/firebase.js';

/**
 * The state of a visitor:
 *
 * - `signed-in`: the API has a session for the browser. `session` is the
 *   signed-in adult.
 * - `unverified`: the Firebase user is signed in, and the email is not verified.
 *   There is no session. `email` is the address that the verification link
 *   goes to.
 * - `signed-out`: no session and no Firebase user.
 */
export type AuthState =
  | { status: 'signed-in'; session: SessionResponse }
  | { status: 'unverified'; email: string }
  | { status: 'signed-out' };

/**
Reads the session of the browser (`GET /api/session`). `undefined` means that there is none (401).
*/
export async function getSession(fetcher: Fetcher): Promise<SessionResponse | undefined> {
  const response = await fetcher('/api/session');
  if (response.status === 401) return undefined;
  const ok = await expectOk(response);
  return (await ok.json()) as SessionResponse;
}

/**
 * Exchanges a Firebase ID token for a session (`POST /api/session`). The API
 * sets the cookie. `'unverified'` means that the API refused the token because
 * the email is not verified (403 `EMAIL_NOT_VERIFIED`).
 */
export async function createSession(
  fetcher: Fetcher,
  idToken: string,
): Promise<SessionResponse | 'unverified'> {
  const request: CreateSessionRequest = { idToken };
  try {
    return await sendJson<SessionResponse>(fetcher, 'POST', '/api/session', request);
  } catch (error) {
    if (hasCode(error, 'EMAIL_NOT_VERIFIED')) return 'unverified';
    throw error;
  }
}

/**
 * Signs the Firebase SDK out after the exchange. The session is already in
 * place, so a failure here is only logged.
 */
async function endFirebaseUser(): Promise<void> {
  try {
    await signOut(getFirebaseAuth());
  } catch (error) {
    console.error('Sign out of the Firebase SDK after the session exchange failed:', error);
  }
}

/**
 * Finds the state of the visitor. It reads the session first. With no session,
 * it waits for Firebase to restore its user. A user with a verified email is
 * exchanged for a session, and the SDK then signs out. A token that the API
 * refuses (401) signs the SDK out, so the visitor is signed out.
 *
 * Give it `apiFetchRaw`: a 401 is an ordinary answer here. Another failure (a
 * 5xx, no network) throws an `ApiError` or the fetch error.
 */
export async function resolveAuth(fetcher: Fetcher): Promise<AuthState> {
  const session = await getSession(fetcher);
  if (session) return { status: 'signed-in', session };

  const auth = getFirebaseAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return { status: 'signed-out' };
  const email = user.email ?? '';
  if (!user.emailVerified) return { status: 'unverified', email };

  let created: SessionResponse | 'unverified';
  try {
    created = await createSession(fetcher, await user.getIdToken());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await endFirebaseUser();
      return { status: 'signed-out' };
    }
    throw error;
  }
  if (created === 'unverified') return { status: 'unverified', email };
  await endFirebaseUser();
  return { status: 'signed-in', session: created };
}
