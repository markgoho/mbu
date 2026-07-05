import {
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import {
  REGISTRATIONS_SUBCOLLECTION,
  type RegistrationDocument,
} from "../../../collections/registrations.js";
import {
  UNIVERSITIES_COLLECTION,
  type UniversityDocument,
} from "../../../collections/universities.js";
import { RETENTION_WINDOW_DAYS } from "../../../constants/retention.js";
import type { PurgeResponse } from "../../schemas/retention-schemas.js";
import type { RetentionService } from "./interface.js";

const RETENTION_WINDOW_MS = RETENTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

export class RetentionServiceImpl implements RetentionService {
  constructor(private readonly database?: Firestore) {}

  private db(): Firestore {
    return this.database ?? getFirestore();
  }

  async purge(): Promise<PurgeResponse> {
    const cutoff = Timestamp.fromMillis(Date.now() - RETENTION_WINDOW_MS);

    // endDate is null for single-day events, in which case startDate is the
    // effective end; endDate is otherwise always >= startDate. So "startDate
    // < cutoff" is a safe superset — every university whose effective end
    // precedes the cutoff also has startDate before it — filtered precisely
    // in memory below (Firestore can't query a `COALESCE`-style OR).
    const candidates = await this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .where("startDate", "<", cutoff)
      .get();

    let universitiesProcessed = 0;
    let registrationsPurged = 0;

    for (const doc of candidates.docs) {
      const university = doc.data() as UniversityDocument;
      const effectiveEnd = university.endDate ?? university.startDate;
      if (effectiveEnd.toMillis() >= cutoff.toMillis()) continue;

      universitiesProcessed += 1;
      registrationsPurged += await this.purgeUniversity(doc.id);
    }

    return { universitiesProcessed, registrationsPurged };
  }

  private async purgeUniversity(universityId: string): Promise<number> {
    const pending = await this.db()
      .collectionGroup(REGISTRATIONS_SUBCOLLECTION)
      .where("universityId", "==", universityId)
      .where("purgedAt", "==", null)
      .get();

    if (pending.empty) return 0;

    const batch = this.db().batch();
    const purgedAt = Timestamp.now();
    const scrubbedFields: Pick<
      RegistrationDocument,
      | "scoutFirstName"
      | "scoutLastName"
      | "scoutUnit"
      | "accommodations"
      | "parentName"
      | "parentEmail"
      | "purgedAt"
    > = {
      scoutFirstName: null,
      scoutLastName: null,
      scoutUnit: null,
      accommodations: null,
      parentName: null,
      parentEmail: null,
      purgedAt,
    };
    for (const doc of pending.docs) {
      batch.update(doc.ref, scrubbedFields);
    }
    await batch.commit();

    return pending.size;
  }
}

export const retentionService: RetentionService = new RetentionServiceImpl();
