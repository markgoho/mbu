import type { Timestamp } from "firebase-admin/firestore";

export const UNIVERSITIES_COLLECTION = "universities";

export type UniversityStatus =
  | "draft"
  | "submitted"
  | "needs_review"
  | "published"
  | "closed"
  | "rejected";

/** Chancellor-pays-to-publish billing. `not_required` in v1 (money off). */
export type BillingStatus = "not_required" | "pending" | "paid" | "waived";

export interface UniversityBilling {
  status: BillingStatus;
  amountCents: number | null;
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
  paidAt: Timestamp | null;
}

/**
 * A flexible-duration block within the event. Embedded on the university (bounded set,
 * edited with the university). Times are absolute; render with the university timezone.
 */
export interface Period {
  periodId: string;
  label: string;
  startsAt: Timestamp;
  endsAt: Timestamp;
}

export interface UniversityLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

/** A dated MBU event. */
export interface UniversityDocument {
  title: string;
  status: UniversityStatus;
  /** IANA timezone, e.g. "America/New_York". Period times are absolute; tz is for display. */
  timezone: string;
  startDate: Timestamp;
  /** Set only for multi-day events. */
  endDate: Timestamp | null;
  registrationOpensAt: Timestamp | null;
  registrationClosesAt: Timestamp;
  location: UniversityLocation;
  periods: Period[];
  createdByUid: string;
  submittedAt: Timestamp | null;
  publishedAt: Timestamp | null;
  reviewNote: string | null;
  billing: UniversityBilling | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
