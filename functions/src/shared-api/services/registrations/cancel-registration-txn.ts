import {
  FieldValue,
  Timestamp,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import { classesPath } from "../../../collections/classes.js";
import {
  registrationsPath,
  type RegistrationDocument,
} from "../../../collections/registrations.js";

export interface CancelRegistrationParams {
  universityId: string;
  classId: string;
  registrationRef: DocumentReference;
  registration: RegistrationDocument;
}

export interface CancelRegistrationResult {
  /** scoutId promoted off the waitlist to fill the freed seat, if any. */
  promotedScoutId: string | null;
}

/**
 * Soft-cancels an active registration inside an already-open transaction:
 * decrements the class's seat/waitlist counts and promotes the oldest
 * waitlisted scout if a seat frees up. Shared by direct parent cancellation
 * and the scout/account deletion cascades — callers own the surrounding
 * authorization checks, the post-commit promotion notification, and (for the
 * deletion cascades) hard-deleting the registration doc afterward.
 */
export async function cancelRegistrationTxn(
  txn: Transaction,
  db: Firestore,
  {
    universityId,
    classId,
    registrationRef,
    registration,
  }: CancelRegistrationParams,
): Promise<CancelRegistrationResult> {
  const classRef = db.doc(`${classesPath(universityId)}/${classId}`);
  const now = Timestamp.now();
  let promotedScoutId: string | null = null;

  if (registration.status === "enrolled") {
    const waitlistQuery = db
      .collection(registrationsPath(universityId, classId))
      .where("status", "==", "waitlisted")
      .orderBy("waitlistedAt", "asc")
      .limit(1);
    const waitlistSnapshot = await txn.get(waitlistQuery);
    const nextDoc = waitlistSnapshot.docs[0];

    if (nextDoc) {
      // Cancel-enrolled frees a seat (-1) and the promotion fills it (+1):
      // net enrolledCount change is 0, so only waitlistCount moves. Both
      // must be one combined update() call — Firestore transactions
      // reject a second update() on the same doc ref.
      txn.update(classRef, { waitlistCount: FieldValue.increment(-1) });
      txn.update(nextDoc.ref, {
        status: "enrolled",
        enrolledAt: now,
        waitlistedAt: null,
        updatedAt: now,
      });
      promotedScoutId = nextDoc.id;
    } else {
      txn.update(classRef, { enrolledCount: FieldValue.increment(-1) });
    }
  } else {
    txn.update(classRef, { waitlistCount: FieldValue.increment(-1) });
  }

  txn.update(registrationRef, { status: "cancelled", updatedAt: now });
  return { promotedScoutId };
}
