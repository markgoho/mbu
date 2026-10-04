import type { SessionResponse } from '#lib/api-types/session-api.types.js';
import type { AuthState } from '#lib/auth.js';

/**
 * The layout data of a signed-in adult, from the `(authed)` and `(verified)`
 * guards. A page spec under `(verified)` spreads it into `data`.
 */
export const identity: SessionResponse = {
  uid: 'u1',
  email: 'pat@example.com',
  displayName: 'Pat Parent',
  superAdmin: false,
};

export const signedIn: { auth: AuthState; identity: SessionResponse } = {
  auth: { status: 'signed-in', session: identity },
  identity,
};
