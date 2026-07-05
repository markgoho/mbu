import {
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  REGISTRATIONS_SUBCOLLECTION,
  registrationsPath,
  type RegistrationDocument,
} from "../../../collections/registrations.js";
import { scoutsPath, type ScoutDocument } from "../../../collections/scouts.js";
import { emailNotifier } from "../../../registrations-api/services/notifier/email-notifier.js";
import type { Notifier } from "../../../registrations-api/services/notifier/interface.js";
import { NotFoundError } from "../../../shared-api/errors/http-error.js";
import { cancelRegistrationTxn } from "../../../shared-api/services/registrations/cancel-registration-txn.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  ScoutListResponse,
  ScoutRequest,
  ScoutResponse,
} from "../../schemas/scout-schemas.js";
import type { ScoutsService } from "./interface.js";

/** Map the optional-field request onto the fully-nulled stored shape. */
function scoutFields(request: ScoutRequest) {
  return {
    firstName: request.firstName,
    lastName: request.lastName,
    unit: request.unit ?? null,
    council: request.council ?? null,
    district: request.district ?? null,
    ageBand: request.ageBand ?? null,
    bsaId: request.bsaId ?? null,
    accommodations: request.accommodations ?? null,
  };
}

function toScoutResponse(scoutId: string, doc: ScoutDocument): ScoutResponse {
  return {
    scoutId,
    firstName: doc.firstName,
    lastName: doc.lastName,
    unit: doc.unit,
    council: doc.council,
    district: doc.district,
    ageBand: doc.ageBand,
    bsaId: doc.bsaId,
    accommodations: doc.accommodations,
  };
}

export class ScoutsServiceImpl implements ScoutsService {
  constructor(
    private readonly database?: Firestore,
    private readonly notifierPort: Notifier = emailNotifier,
  ) {}

  private db(): Firestore {
    return this.database ?? getFirestore();
  }

  async list(caller: Caller): Promise<ScoutListResponse> {
    const snapshot = await this.db()
      .collection(scoutsPath(caller.uid))
      .orderBy("createdAt")
      .get();
    return {
      scouts: snapshot.docs.map(doc =>
        toScoutResponse(doc.id, doc.data() as ScoutDocument),
      ),
    };
  }

  async create(caller: Caller, request: ScoutRequest): Promise<ScoutResponse> {
    const reference = this.db().collection(scoutsPath(caller.uid)).doc();
    await reference.set({
      ...scoutFields(request),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return toScoutResponse(
      reference.id,
      (await reference.get()).data() as ScoutDocument,
    );
  }

  async update(
    caller: Caller,
    scoutId: string,
    request: ScoutRequest,
  ): Promise<ScoutResponse> {
    const reference = this.db().doc(`${scoutsPath(caller.uid)}/${scoutId}`);
    if (!(await reference.get()).exists) {
      throw new NotFoundError("Scout not found");
    }
    await reference.set(
      { ...scoutFields(request), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return toScoutResponse(
      scoutId,
      (await reference.get()).data() as ScoutDocument,
    );
  }

  /**
   * Right-to-erasure cascade: cancels (and hard-deletes, unlike an ordinary
   * drop) every active registration for this scout — promoting the next
   * waitlisted scout in each affected class — before deleting the scout
   * profile itself. Not blocked by active enrollment; deletion is a right.
   */
  async remove(caller: Caller, scoutId: string): Promise<void> {
    const scoutRef = this.db().doc(`${scoutsPath(caller.uid)}/${scoutId}`);
    if (!(await scoutRef.get()).exists) {
      throw new NotFoundError("Scout not found");
    }

    const activeSnapshot = await this.db()
      .collectionGroup(REGISTRATIONS_SUBCOLLECTION)
      .where("scoutId", "==", scoutId)
      .where("status", "in", ["enrolled", "waitlisted"])
      .get();

    for (const doc of activeSnapshot.docs) {
      const registration = doc.data() as RegistrationDocument;
      let promotedScoutId: string | null = null;

      await this.db().runTransaction(async txn => {
        const result = await cancelRegistrationTxn(txn, this.db(), {
          universityId: registration.universityId,
          classId: registration.classId,
          registrationRef: doc.ref,
          registration,
        });
        promotedScoutId = result.promotedScoutId;
      });

      // Hard-delete: an ordinary drop keeps a cancelled snapshot for the
      // roster's history, but a scout deletion must not leave PII behind.
      await doc.ref.delete();

      if (promotedScoutId) {
        try {
          const promotedSnapshot = await this.db()
            .doc(
              `${registrationsPath(registration.universityId, registration.classId)}/${promotedScoutId}`,
            )
            .get();
          const promoted = promotedSnapshot.data() as RegistrationDocument;
          await this.notifierPort.promoted({
            universityId: registration.universityId,
            classId: registration.classId,
            scoutId: promoted.scoutId,
            parentUid: promoted.parentUid,
            badgeTitle: promoted.badgeTitle,
          });
        } catch (error) {
          logger.error("notifier.promoted failed", { error });
        }
      }
    }

    await scoutRef.delete();
  }
}

export const scoutsService = new ScoutsServiceImpl();
