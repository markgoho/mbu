import { mock } from "bun:test";
import type { DecodedIdToken } from "firebase-admin/auth";
import { AuthError } from "../../shared-api/errors/http-error.js";
import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import { createRegistrationsPlugin } from "../plugins/registrations-plugin.js";
import type {
  RegistrationResponse,
  RosterResponse,
  ScheduleResponse,
} from "../schemas/registration-schemas.js";
import type { RegistrationsService } from "../services/registrations/interface.js";

/**
 * Token verifiers modeling the three auth outcomes the requireAuth resolver
 * distinguishes:
 *
 * - `verified`   — a normal signed-in parent with a verified email (happy path).
 * - `unverified` — a signed-in account whose email is NOT verified (→ 403).
 * - `superAdmin` — a verified super-admin.
 *
 * Each is header-aware like the real verifier: a missing Authorization header
 * rejects with `AuthError` (→ 401) before any email-verified check runs.
 */
function tokenFor(claims: Partial<DecodedIdToken>): TokenVerifier {
  return header => {
    if (!header) {
      return Promise.reject(new AuthError("Missing Authorization header"));
    }
    return Promise.resolve({
      uid: "u1",
      email: "u1@example.com",
      email_verified: true,
      ...claims,
    } as DecodedIdToken);
  };
}

export const tokenVerifiers = {
  verified: tokenFor({}),
  unverified: tokenFor({ email_verified: false }),
  superAdmin: tokenFor({ superAdmin: true }),
} satisfies Record<string, TokenVerifier>;

const sampleRegistration: RegistrationResponse = {
  scoutId: "scout1",
  classId: "cls1",
  universityId: "uni1",
  status: "enrolled",
  periodIds: ["p1"],
  badgeSlug: "camping",
  badgeTitle: "Camping",
  waitlistedAt: null,
  enrolledAt: "2026-07-01T00:00:00.000Z",
};

const emptySchedule: ScheduleResponse = { registrations: [] };

const emptyRoster: RosterResponse = {
  university: {
    title: "Spring MBU",
    startDate: "2026-06-01T12:00:00.000Z",
    endDate: null,
    location: {
      name: "Scout Hall",
      address: "1 Main St",
      city: "Anytown",
      state: "NY",
      zip: "12345",
    },
    timezone: "America/New_York",
  },
  classRosters: [],
};

/**
 * Build the registrations plugin with default MOCK services. Tests override
 * only the service methods and/or `verifyToken` they exercise. Defaults model
 * the happy path (verified parent, successful service calls).
 */
export function createRegistrationsTestPlugin(overrides?: {
  registrationsService?: Partial<RegistrationsService>;
  verifyToken?: TokenVerifier;
}) {
  const registrationsService: RegistrationsService = {
    register: mock(() => Promise.resolve(sampleRegistration)),
    cancel: mock(() => Promise.resolve()),
    listSchedule: mock(() => Promise.resolve(emptySchedule)),
    listRoster: mock(() => Promise.resolve(emptyRoster)),
    ...overrides?.registrationsService,
  };

  return createRegistrationsPlugin({
    registrationsService,
    verifyToken: overrides?.verifyToken ?? tokenVerifiers.verified,
  });
}

export { emptyRoster, emptySchedule, sampleRegistration };
