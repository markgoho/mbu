import { getFirestore } from "firebase-admin/firestore";
import {
  USERS_COLLECTION,
  type UserDocument,
} from "../../../collections/users.js";

/**
 * Resolves a parentUid to their live account email. Injected so notifiers can
 * be unit-tested without Firestore.
 */
export interface UserEmailReader {
  getEmail(parentUid: string): Promise<string | null>;
}

/** Live reader — a single doc get on the users collection. */
export const userEmailReader: UserEmailReader = {
  async getEmail(parentUid) {
    const snapshot = await getFirestore()
      .collection(USERS_COLLECTION)
      .doc(parentUid)
      .get();
    if (!snapshot.exists) return null;
    const user = snapshot.data() as UserDocument;
    return user.email || null;
  },
};
