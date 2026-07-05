import { mock } from "bun:test";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AuthError } from "../../shared-api/errors/http-error.js";
import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import type { Caller } from "../../shared-api/types/caller.js";
import { createUsersPlugin } from "../plugins/users-plugin.js";
import type { ScoutRequest, ScoutResponse } from "../schemas/scout-schemas.js";
import type { UserResponse } from "../schemas/user-schemas.js";
import type { ScoutsService } from "../services/scouts/interface.js";
import type { UsersService } from "../services/users/interface.js";

const ISO = "2026-07-05T00:00:00.000Z";

/**
 * Self-contained token-verifier mocks. Each rejects (401) when no header is
 * present so the requireAuth gate can be exercised, otherwise resolves a
 * decoded token. `unverified` drives the EMAIL_NOT_VERIFIED (403) path.
 */
export const verified: TokenVerifier = header =>
  header
    ? Promise.resolve({
        uid: "u1",
        email: "u1@example.com",
        email_verified: true,
      } as DecodedIdToken)
    : Promise.reject(new AuthError("Missing Authorization header"));

export const unverified: TokenVerifier = header =>
  header
    ? Promise.resolve({
        uid: "u1",
        email: "u1@example.com",
        email_verified: false,
      } as DecodedIdToken)
    : Promise.reject(new AuthError("Missing Authorization header"));

export const superAdmin: TokenVerifier = header =>
  header
    ? Promise.resolve({
        uid: "admin1",
        email: "admin@example.com",
        email_verified: true,
        superAdmin: true,
      } as unknown as DecodedIdToken)
    : Promise.reject(new AuthError("Missing Authorization header"));

function userResponse(caller: Caller): UserResponse {
  return {
    uid: caller.uid,
    displayName: "Pat",
    email: caller.email,
    phone: null,
    acceptedTermsAt: null,
    acceptedPrivacyAt: null,
    acceptedPolicyVersion: null,
    rosterExportAckAt: null,
  };
}

function scoutResponse(scoutId: string, request: ScoutRequest): ScoutResponse {
  return {
    scoutId,
    firstName: request.firstName,
    lastName: request.lastName,
    unit: request.unit ?? null,
    council: request.council ?? null,
    district: request.district ?? null,
    ageBand: request.ageBand ?? null,
    bsaId: request.bsaId ?? null,
    accommodations: request.accommodations ?? null,
  };
}

/**
 * Build the users plugin wired with default MOCK services (interface-typed,
 * overridable per test) and a fake token verifier (defaults to `verified`).
 * Mirrors doula's create-members-test-plugin.
 */
export function createUsersTestPlugin(overrides?: {
  usersService?: Partial<UsersService>;
  scoutsService?: Partial<ScoutsService>;
  verifyToken?: TokenVerifier;
}) {
  const defaultUsersService: UsersService = {
    bootstrap: mock((caller: Caller) =>
      Promise.resolve({ user: userResponse(caller), needsConsent: true }),
    ),
    getMe: mock((caller: Caller) => Promise.resolve(userResponse(caller))),
    onboard: mock((caller: Caller, request) =>
      Promise.resolve({
        ...userResponse(caller),
        displayName: request.displayName,
        acceptedTermsAt: ISO,
        acceptedPrivacyAt: ISO,
        acceptedPolicyVersion: "2026-07-04",
      }),
    ),
    deleteAccount: mock(() => Promise.resolve()),
    ackRosterExport: mock((caller: Caller) =>
      Promise.resolve({ ...userResponse(caller), rosterExportAckAt: ISO }),
    ),
    ...overrides?.usersService,
  };

  const defaultScoutsService: ScoutsService = {
    list: mock(() => Promise.resolve({ scouts: [] })),
    create: mock((_caller: Caller, request: ScoutRequest) =>
      Promise.resolve(scoutResponse("s1", request)),
    ),
    update: mock((_caller: Caller, scoutId: string, request: ScoutRequest) =>
      Promise.resolve(scoutResponse(scoutId, request)),
    ),
    remove: mock(() => Promise.resolve()),
    ...overrides?.scoutsService,
  };

  return createUsersPlugin({
    usersService: defaultUsersService,
    scoutsService: defaultScoutsService,
    verifyToken: overrides?.verifyToken ?? verified,
  });
}
