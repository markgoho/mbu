import { Timestamp } from "firebase-admin/firestore";

/**
 * Mirrors universities-api's `toIso` helper. Duplicated rather than
 * cross-imported — each api module keeps its own copy per repo convention.
 */
export function toIso(value: Timestamp | null | undefined): string | null {
  return value instanceof Timestamp ? value.toDate().toISOString() : null;
}
