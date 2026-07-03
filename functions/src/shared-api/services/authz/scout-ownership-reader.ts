import { getFirestore } from "firebase-admin/firestore";
import { scoutsPath } from "../../../collections/scouts.js";

/**
 * Checks whether a scout profile exists under a given parent. Injected into
 * `assertOwnsScout` for unit testing without Firestore.
 */
export interface ScoutOwnershipReader {
  exists(parentUid: string, scoutId: string): Promise<boolean>;
}

/** Live reader — a single doc get on the parent's scouts subcollection. */
export const scoutOwnershipReader: ScoutOwnershipReader = {
  async exists(parentUid, scoutId) {
    const snapshot = await getFirestore()
      .doc(`${scoutsPath(parentUid)}/${scoutId}`)
      .get();
    return snapshot.exists;
  },
};
