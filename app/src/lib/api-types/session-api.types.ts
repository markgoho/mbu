/**
 * The body of `POST /api/session`: the Firebase ID token to exchange for the
 * `__session` cookie (ADR 0007 in `api/docs/adr/`).
 */
export interface CreateSessionRequest {
  idToken: string;
}

/**
 * The body of `POST` and `GET /api/session`: the signed-in adult. The values
 * are the ones of the ID token at sign-in.
 */
export interface SessionResponse {
  uid: string;
  email: string;
  /**
  The name of the account at sign-in, or `''` when it has none.
  */
  displayName: string;
  superAdmin: boolean;
}
