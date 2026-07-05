import { getAuth } from "firebase-admin/auth";

/**
 * Firebase Auth admin operations, injected so callers can mock at the
 * boundary in tests (no Auth emulator).
 */
export interface AuthAdminPort {
  deleteUser(uid: string): Promise<void>;
}

export const authAdminPort: AuthAdminPort = {
  deleteUser: uid => getAuth().deleteUser(uid),
};
