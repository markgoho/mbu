import { ForbiddenError } from "../../errors/http-error.js";
import type { Caller } from "../../types/caller.js";
import {
  roleGrantsReader,
  type RoleGrantsReader,
} from "./role-grants-reader.js";
import {
  scoutOwnershipReader,
  type ScoutOwnershipReader,
} from "./scout-ownership-reader.js";

/**
 * Contextual authorization primitives. Each resolves the ONE grant for the ONE
 * scope in the request (no eager loading of all a caller's grants) and throws a
 * 403 on miss. Super-admin bypasses role checks; scout ownership is strict
 * (youth PII) and has no bypass.
 */

/** Require the caller to be an active chancellor of the university (or super-admin). */
export async function assertChancellorOf(
  caller: Caller,
  universityId: string,
  reader: RoleGrantsReader = roleGrantsReader,
): Promise<void> {
  if (caller.superAdmin) return;
  if (
    await reader.hasActiveGrant({
      uid: caller.uid,
      scopeId: universityId,
      role: "chancellor",
    })
  ) {
    return;
  }
  throw new ForbiddenError("You are not a chancellor of this university");
}

/**
 * Require the caller to be an active counselor of the class — or a chancellor of
 * the owning university (chancellors supersede), or super-admin.
 */
export async function assertCounselorOf(
  caller: Caller,
  scope: { universityId: string; classId: string },
  reader: RoleGrantsReader = roleGrantsReader,
): Promise<void> {
  if (caller.superAdmin) return;
  if (
    await reader.hasActiveGrant({
      uid: caller.uid,
      scopeId: scope.classId,
      role: "counselor",
    })
  ) {
    return;
  }
  if (
    await reader.hasActiveGrant({
      uid: caller.uid,
      scopeId: scope.universityId,
      role: "chancellor",
    })
  ) {
    return;
  }
  throw new ForbiddenError("You are not a counselor of this class");
}

/** Require the caller to own the scout (parent-of-scout). No super-admin bypass. */
export async function assertOwnsScout(
  caller: Caller,
  scoutId: string,
  reader: ScoutOwnershipReader = scoutOwnershipReader,
): Promise<void> {
  if (await reader.exists(caller.uid, scoutId)) return;
  throw new ForbiddenError("You do not have access to this scout");
}

/** Require the super-admin custom claim. */
export function requireSuperAdmin(caller: Caller): void {
  if (!caller.superAdmin) {
    throw new ForbiddenError("Super-admin privileges required");
  }
}
