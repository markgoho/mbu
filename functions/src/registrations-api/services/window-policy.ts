import type { Timestamp } from "firebase-admin/firestore";
import type { UniversityDocument } from "../../collections/universities.js";
import {
  ERROR_CODES,
  ForbiddenError,
} from "../../shared-api/errors/http-error.js";
import {
  roleGrantsReader,
  type RoleGrantsReader,
} from "../../shared-api/services/authz/role-grants-reader.js";
import type { Caller } from "../../shared-api/types/caller.js";

/**
 * Whether the caller may bypass the public registration window: super-admins
 * and active chancellors of the university (the people running the event) can
 * register/cancel scouts outside the public window — e.g. dry runs, walk-ins,
 * post-event cleanup.
 */
export async function computeBypassWindow(
  caller: Caller,
  universityId: string,
  reader: RoleGrantsReader = roleGrantsReader,
): Promise<boolean> {
  if (caller.superAdmin) return true;
  return reader.hasActiveGrant({
    uid: caller.uid,
    scopeId: universityId,
    role: "chancellor",
  });
}

/**
 * Enforce the public registration window against `now`. Privileged callers
 * (bypassWindow) skip every check here, including the published-status gate.
 * Pure and unit-testable: `now` is passed in rather than read internally.
 */
export function assertWindowOpen(
  university: UniversityDocument,
  bypassWindow: boolean,
  now: Timestamp,
): void {
  if (bypassWindow) return;

  if (university.status !== "published") {
    throw new ForbiddenError(
      "This event is not open for registration",
      ERROR_CODES.EVENT_NOT_OPEN,
    );
  }
  if (
    university.registrationOpensAt !== null &&
    now.toMillis() < university.registrationOpensAt.toMillis()
  ) {
    throw new ForbiddenError(
      "Registration has not opened yet",
      ERROR_CODES.REGISTRATION_NOT_OPEN,
    );
  }
  if (now.toMillis() > university.registrationClosesAt.toMillis()) {
    throw new ForbiddenError(
      "Registration is closed",
      ERROR_CODES.REGISTRATION_CLOSED,
    );
  }
}
