import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  CLASSES_SUBCOLLECTION,
  type ClassDocument,
} from "../../../collections/classes.js";
import {
  UNIVERSITIES_COLLECTION,
  type Period,
  type UniversityDocument,
} from "../../../collections/universities.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../shared-api/errors/http-error.js";
import { assertChancellorOf } from "../../../shared-api/services/authz/assertions.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  PeriodInput,
  PeriodsPutRequest,
  PeriodsResponse,
} from "../../schemas/period-schemas.js";
import {
  assertEditableStatus,
  mintPeriodId,
  parseIso,
  toIso,
  validateDateOrder,
} from "../validation.js";
import type { PeriodsService } from "./interface.js";

/** Split into chunks of ≤10 for Firestore's array-contains-any limit. */
function chunk10<T>(items: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += 10) {
    chunks.push(items.slice(i, i + 10));
  }
  return chunks;
}

export function toPeriodsResponse(periods: Period[]): PeriodsResponse {
  return {
    periods: periods.map(p => ({
      periodId: p.periodId,
      label: p.label,
      startsAt: toIso(p.startsAt) ?? "",
      endsAt: toIso(p.endsAt) ?? "",
    })),
  };
}

function buildPeriods(input: PeriodInput[], existing: Period[]): Period[] {
  const existingById = new Map(existing.map(p => [p.periodId, p]));
  const seenIds = new Set<string>();

  return input.map(item => {
    const label = item.label.trim();
    if (!label) {
      throw new ValidationError("Period label is required");
    }

    const startsAt = parseIso(item.startsAt);
    const endsAt = parseIso(item.endsAt);
    validateDateOrder(
      startsAt,
      endsAt,
      "Period startsAt must be before endsAt",
    );

    const periodId = item.periodId ?? mintPeriodId();
    if (seenIds.has(periodId)) {
      throw new ValidationError("Duplicate periodId in request");
    }
    seenIds.add(periodId);

    if (item.periodId && !existingById.has(item.periodId)) {
      throw new ValidationError(`Unknown periodId: ${item.periodId}`);
    }

    return { periodId, label, startsAt, endsAt };
  });
}

export const PeriodsServiceImpl: PeriodsService = {
  async put(
    caller: Caller,
    universityId: string,
    request: PeriodsPutRequest,
  ): Promise<PeriodsResponse> {
    await assertChancellorOf(caller, universityId);

    const universityRef = getFirestore()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);

    return getFirestore().runTransaction(async txn => {
      const snapshot = await txn.get(universityRef);
      if (!snapshot.exists) {
        throw new NotFoundError("University not found");
      }
      const current = snapshot.data() as UniversityDocument;
      assertEditableStatus(current.status);

      const nextPeriods = buildPeriods(request.periods, current.periods);
      const nextIds = new Set(nextPeriods.map(p => p.periodId));
      const removedIds = current.periods
        .map(p => p.periodId)
        .filter(id => !nextIds.has(id));

      if (removedIds.length > 0) {
        const classesRef = getFirestore().collection(
          `${UNIVERSITIES_COLLECTION}/${universityId}/${CLASSES_SUBCOLLECTION}`,
        );
        // array-contains-any accepts at most 10 values, so chunk the removed
        // ids and union the conflicts (deduping by class id).
        const conflicts = new Map<string, { classId: string; title: string }>();
        for (const chunk of chunk10(removedIds)) {
          const snapshot = await txn.get(
            classesRef.where("periodIds", "array-contains-any", chunk),
          );
          for (const doc of snapshot.docs) {
            const data = doc.data() as ClassDocument;
            conflicts.set(doc.id, { classId: doc.id, title: data.badgeTitle });
          }
        }
        if (conflicts.size > 0) {
          throw new ConflictError(
            "Cannot remove periods that are assigned to classes",
            { classes: [...conflicts.values()] },
          );
        }
      }

      txn.update(universityRef, {
        periods: nextPeriods,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return toPeriodsResponse(nextPeriods);
    });
  },
};
