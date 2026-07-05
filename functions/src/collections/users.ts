import type { Timestamp } from "firebase-admin/firestore";

export const USERS_COLLECTION = "users";

/** Self-attested counselor profile; only populated if the user acts as a counselor. */
export interface CounselorProfile {
  bsaId: string | null;
  /** Badge slugs the user self-attests to counsel. */
  attestedBadges: string[];
  attestedAt: Timestamp | null;
}

/**
 * Adult account holder (parent / counselor / chancellor). Keyed by Firebase Auth UID.
 * "Parent" is implicit ownership (see scout.parentUid / registration.parentUid), not a stored role.
 */
export interface UserDocument {
  displayName: string;
  /** Mirrors Firebase Auth email (auth is authoritative). */
  email: string;
  phone: string | null;
  counselorProfile: CounselorProfile | null;
  acceptedTermsAt: Timestamp | null;
  acceptedPrivacyAt: Timestamp | null;
  /** POLICY_VERSION in effect when onboarding consent was accepted. */
  acceptedPolicyVersion: string | null;
  /** Set once this chancellor/counselor has clicked through the roster-export warning. */
  rosterExportAckAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
