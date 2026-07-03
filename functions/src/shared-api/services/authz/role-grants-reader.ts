import { getFirestore } from "firebase-admin/firestore";
import {
  type GrantRole,
  ROLE_GRANTS_COLLECTION,
} from "../../../collections/role-grants.js";

/** A specific (person, scope, role) grant lookup. */
export interface GrantQuery {
  uid: string;
  scopeId: string;
  role: GrantRole;
}

/**
 * Reads roleGrants for authorization checks. Injected into the assertion
 * primitives so they can be unit-tested without Firestore.
 */
export interface RoleGrantsReader {
  hasActiveGrant(query: GrantQuery): Promise<boolean>;
}

/**
 * Live reader. The all-equality query (uid, scopeId, role, status) is served by
 * Firestore's automatic single-field indexes via a zig-zag merge — no composite
 * index required.
 */
export const roleGrantsReader: RoleGrantsReader = {
  async hasActiveGrant({ uid, scopeId, role }) {
    const snapshot = await getFirestore()
      .collection(ROLE_GRANTS_COLLECTION)
      .where("uid", "==", uid)
      .where("scopeId", "==", scopeId)
      .where("role", "==", role)
      .where("status", "==", "active")
      .limit(1)
      .get();
    return !snapshot.empty;
  },
};
