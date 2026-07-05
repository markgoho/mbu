import type { UniversityStatus } from "../../collections/universities.js";
import { ConflictError } from "../../shared-api/errors/http-error.js";

const LEGAL_TRANSITIONS: Record<UniversityStatus, UniversityStatus[]> = {
  draft: ["submitted"],
  rejected: ["submitted"],
  submitted: ["published", "rejected"],
  published: ["closed"],
  closed: [],
  needs_review: [],
};

/** Pure from→to legality check. Actor authorization is enforced separately by the caller. */
export function assertTransition(
  from: UniversityStatus,
  to: UniversityStatus,
): void {
  if (!LEGAL_TRANSITIONS[from].includes(to)) {
    throw new ConflictError(`Cannot transition from ${from} to ${to}`);
  }
}
