import type { Timestamp } from "firebase-admin/firestore";
import { classesPath } from "./classes.js";

export const REGISTRATIONS_SUBCOLLECTION = "registrations";

/**
 * Firestore path to a class's registrations subcollection.
 * The registration doc id is the scoutId, making "<=1 seat per scout per class"
 * a structural invariant.
 */
export function registrationsPath(
  universityId: string,
  classId: string,
): string {
  return `${classesPath(universityId)}/${classId}/${REGISTRATIONS_SUBCOLLECTION}`;
}

export type RegistrationStatus = "enrolled" | "waitlisted" | "cancelled";

/**
 * A scout's seat hold in a class. Soft-deleted (status: 'cancelled'), not hard-deleted
 * until post-event purge. Denormalized fields are snapshots kept fresh by bounded
 * re-sync on the parent edit paths (no Firestore triggers).
 */
export interface RegistrationDocument {
  /** Equals the document id. */
  scoutId: string;
  parentUid: string;
  /** Denormalized for collection-group conflict/schedule queries. */
  universityId: string;
  classId: string;
  /** Denormalized from the class for the in-transaction period-conflict check. */
  periodIds: string[];
  badgeSlug: string;
  badgeTitle: string;
  // Scout snapshot for the roster.
  scoutFirstName: string;
  scoutLastName: string;
  scoutUnit: string | null;
  /** Visible to this class's counselor/chancellor via API-restricted roster reads. */
  accommodations: string | null;
  // Parent contact snapshot. parentEmail is display-only; delivery resolves the live user doc.
  parentName: string;
  parentEmail: string;
  status: RegistrationStatus;
  /** Set iff waitlisted; drives promotion ordering (position is derived, not stored). */
  waitlistedAt: Timestamp | null;
  enrolledAt: Timestamp | null;
  parentConsentAt: Timestamp | null;
  /** POLICY_VERSION in effect when parentConsentAt was stamped. */
  acceptedPolicyVersion: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
