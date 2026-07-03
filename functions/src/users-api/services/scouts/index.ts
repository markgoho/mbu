import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { type ScoutDocument, scoutsPath } from "../../../collections/scouts.js";
import { NotFoundError } from "../../../shared-api/errors/http-error.js";
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
  async list(caller: Caller): Promise<ScoutListResponse> {
    const snapshot = await getFirestore()
      .collection(scoutsPath(caller.uid))
      .orderBy("createdAt")
      .get();
    return {
      scouts: snapshot.docs.map((doc) =>
        toScoutResponse(doc.id, doc.data() as ScoutDocument),
      ),
    };
  }

  async create(caller: Caller, request: ScoutRequest): Promise<ScoutResponse> {
    const reference = getFirestore().collection(scoutsPath(caller.uid)).doc();
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
    const reference = getFirestore().doc(`${scoutsPath(caller.uid)}/${scoutId}`);
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

  async remove(caller: Caller, scoutId: string): Promise<void> {
    const reference = getFirestore().doc(`${scoutsPath(caller.uid)}/${scoutId}`);
    if (!(await reference.get()).exists) {
      throw new NotFoundError("Scout not found");
    }
    await reference.delete();
  }
}

export const scoutsService = new ScoutsServiceImpl();
