import type { Timestamp } from "firebase-admin/firestore";
import { UNIVERSITIES_COLLECTION } from "./universities.js";

export const CLASSES_SUBCOLLECTION = "classes";

/** Firestore path to a university's classes subcollection. */
export function classesPath(universityId: string): string {
  return `${UNIVERSITIES_COLLECTION}/${universityId}/${CLASSES_SUBCOLLECTION}`;
}

/**
 * Display cache of a class counselor, including self-attested credentials.
 * Authorization always queries roleGrants — never this array.
 */
export interface ClassCounselor {
  uid: string;
  displayName: string;
  /** Self-attested BSA member ID; not verified by Scouting America. */
  bsaId: string;
  disclaimerAcceptedAt: Timestamp;
  disclaimerVersion: string;
}

/** A badge taught in one or more periods. */
export interface ClassDocument {
  /** Links to the static badge catalog (scripts/merit-badges.ts / Hugo data.json). */
  badgeSlug: string;
  badgeTitle: string;
  eagleRequired: boolean;
  /** One or more periods (multi-period classes). */
  periodIds: string[];
  capacity: number;
  /** Plain counters, maintained inside the seat transaction (not sharded — scale is small). */
  enrolledCount: number;
  waitlistCount: number;
  room: string | null;
  notes: string | null;
  /** Display cache only; see ClassCounselor. */
  counselors: ClassCounselor[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
