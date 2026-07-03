import type { Timestamp } from "firebase-admin/firestore";
import { USERS_COLLECTION } from "./users.js";

export const SCOUTS_SUBCOLLECTION = "scouts";

/** Firestore path to a parent's scouts subcollection. */
export function scoutsPath(parentUid: string): string {
  return `${USERS_COLLECTION}/${parentUid}/${SCOUTS_SUBCOLLECTION}`;
}

/** Coarse age band — never store DOB or exact age. Scouts age out at 18. */
export type AgeBand = "10-11" | "12-13" | "14-15" | "16-17";

/**
 * Dependent youth profile, private under the owning parent.
 * Minimal PII, no structured medical data.
 */
export interface ScoutDocument {
  firstName: string;
  lastName: string;
  unit: string | null;
  council: string | null;
  district: string | null;
  ageBand: AgeBand | null;
  bsaId: string | null;
  /** Free text only — no structured medical schema. */
  accommodations: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
