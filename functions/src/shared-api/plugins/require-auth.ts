import type { DecodedIdToken } from "firebase-admin/auth";
import {
  AuthError,
  ERROR_CODES,
  ForbiddenError,
} from "../errors/http-error.js";
import { verifyAuthToken } from "../services/auth/verify-token.js";
import type { Caller } from "../types/caller.js";

export type TokenVerifier = (
  authorizationHeader: string | undefined,
) => Promise<DecodedIdToken>;

/**
 * Build a Caller from a verified token, enforcing the "verified email for
 * everyone" invariant (#81). Unverified sessions get a distinct 403 the client
 * maps to the /verify-email gate.
 */
export function toVerifiedCaller(decoded: DecodedIdToken): Caller {
  if (!decoded.email) {
    throw new AuthError("Authenticated account has no email address");
  }
  if (decoded.email_verified !== true) {
    throw new ForbiddenError(
      "Email address is not verified",
      ERROR_CODES.EMAIL_NOT_VERIFIED,
    );
  }
  return {
    uid: decoded.uid,
    email: decoded.email.toLowerCase(),
    emailVerified: true,
    superAdmin: decoded["superAdmin"] === true,
  };
}

/**
 * Elysia `resolve` handler factory doing authentication ONLY. Apply it on the
 * same instance as the routes so handlers can read `caller`:
 *
 *   new Elysia().resolve(requireAuth()).get("/me", ({ caller }) => ...)
 *
 * Authorization (role-in-scope checks) is separate — see services/authz. Inject
 * a fake verifier in tests via the `verifyToken` argument.
 */
export function requireAuth(verifyToken: TokenVerifier = verifyAuthToken) {
  return async ({
    headers,
  }: {
    headers: Record<string, string | undefined>;
  }): Promise<{ caller: Caller }> => {
    const decoded = await verifyToken(headers["authorization"]);
    return { caller: toVerifiedCaller(decoded) };
  };
}
