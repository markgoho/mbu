import type { Timestamp } from "firebase-admin/firestore";

export const ROLE_GRANTS_COLLECTION = "roleGrants";

export type GrantRole = "chancellor" | "counselor";
export type GrantScopeType = "university" | "class";
export type GrantStatus = "invited" | "active" | "revoked";

/**
 * Deterministic role-grant id: `{scopeId}:{role}:{uidOrEmail}`.
 * Makes granting idempotent and structurally prevents duplicate grants.
 * Pass the uid when known, otherwise the invited email.
 */
export function roleGrantId(
  scopeId: string,
  role: GrantRole,
  uidOrEmail: string,
): string {
  return `${scopeId}:${role}:${uidOrEmail}`;
}

/**
 * Contextual membership grant — the many-to-many join between users and scopes.
 * A user may hold many grants across many universities/classes; a scope may have
 * many grantees. roleGrants is the single source of truth for authorization.
 */
export interface RoleGrantDocument {
  role: GrantRole;
  scopeType: GrantScopeType;
  /** The universityId or classId being granted on. */
  scopeId: string;
  /** Always set (even for class grants) — enables class-path building and per-event purge. */
  universityId: string;
  /** Null while the invite is outstanding. */
  uid: string | null;
  /** Set when a counselor is invited before they have an account. */
  invitedEmail: string | null;
  status: GrantStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
