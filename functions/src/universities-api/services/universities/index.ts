import {
  FieldValue,
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import {
  CLASSES_SUBCOLLECTION,
  type ClassDocument,
} from "../../../collections/classes.js";
import {
  ROLE_GRANTS_COLLECTION,
  roleGrantId,
  type RoleGrantDocument,
} from "../../../collections/role-grants.js";
import {
  UNIVERSITIES_COLLECTION,
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
  ClassResponse,
  UniversityDetailResponse,
} from "../../schemas/class-schemas.js";
import type {
  UniversityCreateRequest,
  UniversityListResponse,
  UniversityPatchRequest,
  UniversityResponse,
} from "../../schemas/university-schemas.js";
import {
  assertDraftStatus,
  parseIso,
  toIso,
  validateDateOrder,
  validateLocation,
  validateTimezone,
} from "../validation.js";
import type { UniversitiesService } from "./interface.js";

function toUniversityResponse(
  id: string,
  doc: UniversityDocument,
): UniversityResponse {
  return {
    id,
    title: doc.title,
    status: doc.status,
    timezone: doc.timezone,
    startDate: toIso(doc.startDate) ?? "",
    endDate: toIso(doc.endDate),
    registrationOpensAt: toIso(doc.registrationOpensAt),
    registrationClosesAt: toIso(doc.registrationClosesAt) ?? "",
    location: doc.location,
    createdByUid: doc.createdByUid,
    createdAt: toIso(doc.createdAt) ?? "",
    updatedAt: toIso(doc.updatedAt) ?? "",
  };
}

function toClassResponse(classId: string, doc: ClassDocument): ClassResponse {
  return {
    classId,
    badgeSlug: doc.badgeSlug,
    badgeTitle: doc.badgeTitle,
    eagleRequired: doc.eagleRequired,
    periodIds: doc.periodIds,
    capacity: doc.capacity,
    enrolledCount: doc.enrolledCount,
    waitlistCount: doc.waitlistCount,
    room: doc.room,
    notes: doc.notes,
    counselors: doc.counselors.map(c => ({
      uid: c.uid,
      displayName: c.displayName,
      bsaId: c.bsaId,
      disclaimerAcceptedAt: toIso(c.disclaimerAcceptedAt) ?? "",
      disclaimerVersion: c.disclaimerVersion,
    })),
    createdAt: toIso(doc.createdAt) ?? "",
    updatedAt: toIso(doc.updatedAt) ?? "",
  };
}

function validateCreateFields(request: UniversityCreateRequest): {
  startDate: Timestamp;
  endDate: Timestamp | null;
  registrationOpensAt: Timestamp | null;
  registrationClosesAt: Timestamp;
} {
  validateTimezone(request.timezone);
  validateLocation(request.location);

  const startDate = parseIso(request.startDate);
  const endDate =
    request.endDate === undefined || request.endDate === null
      ? null
      : parseIso(request.endDate);
  if (endDate && startDate.toMillis() > endDate.toMillis()) {
    throw new ValidationError("endDate must be on or after startDate");
  }

  const registrationClosesAt = parseIso(request.registrationClosesAt);
  const registrationOpensAt =
    request.registrationOpensAt === undefined ||
    request.registrationOpensAt === null
      ? null
      : parseIso(request.registrationOpensAt);
  if (registrationOpensAt) {
    validateDateOrder(
      registrationOpensAt,
      registrationClosesAt,
      "registrationOpensAt must be before registrationClosesAt",
    );
  }

  return { startDate, endDate, registrationOpensAt, registrationClosesAt };
}

export class UniversitiesServiceImpl implements UniversitiesService {
  constructor(private readonly database?: Firestore) {}

  private db(): Firestore {
    return this.database ?? getFirestore();
  }

  async create(
    caller: Caller,
    request: UniversityCreateRequest,
  ): Promise<UniversityResponse> {
    const { startDate, endDate, registrationOpensAt, registrationClosesAt } =
      validateCreateFields(request);

    const universityRef = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(request.id);
    const grantRef = this.db()
      .collection(ROLE_GRANTS_COLLECTION)
      .doc(roleGrantId(request.id, "chancellor", caller.uid));

    const university: Omit<UniversityDocument, "createdAt" | "updatedAt"> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      title: request.title.trim(),
      status: "draft",
      timezone: request.timezone,
      startDate,
      endDate,
      registrationOpensAt,
      registrationClosesAt,
      location: {
        name: request.location.name.trim(),
        address: request.location.address.trim(),
        city: request.location.city.trim(),
        state: request.location.state.trim(),
        zip: request.location.zip.trim(),
      },
      periods: [],
      createdByUid: caller.uid,
      submittedAt: null,
      publishedAt: null,
      reviewNote: null,
      billing: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const grant: Omit<RoleGrantDocument, "createdAt" | "updatedAt"> & {
      createdAt: FieldValue;
      updatedAt: FieldValue;
    } = {
      role: "chancellor",
      scopeType: "university",
      scopeId: request.id,
      universityId: request.id,
      uid: caller.uid,
      invitedEmail: null,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await this.db().runTransaction(async txn => {
      const existing = await txn.get(universityRef);
      if (existing.exists) {
        throw new ConflictError("University already exists");
      }
      txn.set(universityRef, university);
      txn.set(grantRef, grant);
    });

    const snapshot = await universityRef.get();
    return toUniversityResponse(
      request.id,
      snapshot.data() as UniversityDocument,
    );
  }

  async patch(
    caller: Caller,
    universityId: string,
    request: UniversityPatchRequest,
  ): Promise<UniversityResponse> {
    await assertChancellorOf(caller, universityId);

    const reference = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      throw new NotFoundError("University not found");
    }
    const current = snapshot.data() as UniversityDocument;
    assertDraftStatus(current.status);

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (request.title !== undefined) {
      updates["title"] = request.title.trim();
    }
    if (request.timezone !== undefined) {
      validateTimezone(request.timezone);
      updates["timezone"] = request.timezone;
    }
    if (request.location !== undefined) {
      validateLocation(request.location);
      updates["location"] = {
        name: request.location.name.trim(),
        address: request.location.address.trim(),
        city: request.location.city.trim(),
        state: request.location.state.trim(),
        zip: request.location.zip.trim(),
      };
    }

    const startDate =
      request.startDate !== undefined
        ? parseIso(request.startDate)
        : current.startDate;
    const endDate =
      request.endDate !== undefined
        ? request.endDate === null
          ? null
          : parseIso(request.endDate)
        : current.endDate;
    if (request.startDate !== undefined) updates["startDate"] = startDate;
    if (request.endDate !== undefined) updates["endDate"] = endDate;
    if (endDate && startDate.toMillis() > endDate.toMillis()) {
      throw new ValidationError("endDate must be on or after startDate");
    }

    const registrationClosesAt =
      request.registrationClosesAt !== undefined
        ? parseIso(request.registrationClosesAt)
        : current.registrationClosesAt;
    const registrationOpensAt =
      request.registrationOpensAt !== undefined
        ? request.registrationOpensAt === null
          ? null
          : parseIso(request.registrationOpensAt)
        : current.registrationOpensAt;
    if (request.registrationClosesAt !== undefined) {
      updates["registrationClosesAt"] = registrationClosesAt;
    }
    if (request.registrationOpensAt !== undefined) {
      updates["registrationOpensAt"] = registrationOpensAt;
    }
    if (registrationOpensAt) {
      validateDateOrder(
        registrationOpensAt,
        registrationClosesAt,
        "registrationOpensAt must be before registrationClosesAt",
      );
    }

    await reference.update(updates);
    return toUniversityResponse(
      universityId,
      (await reference.get()).data() as UniversityDocument,
    );
  }

  async listMine(caller: Caller): Promise<UniversityListResponse> {
    const grants = await this.db()
      .collection(ROLE_GRANTS_COLLECTION)
      .where("uid", "==", caller.uid)
      .where("role", "==", "chancellor")
      .where("status", "==", "active")
      .where("scopeType", "==", "university")
      .get();

    if (grants.empty) {
      return { universities: [] };
    }

    const universityIds = grants.docs.map(
      doc => (doc.data() as RoleGrantDocument).scopeId,
    );
    const universityRefs = universityIds.map(id =>
      this.db().collection(UNIVERSITIES_COLLECTION).doc(id),
    );
    const universityDocs = await this.db().getAll(...universityRefs);

    const summaries = await Promise.all(
      universityDocs
        .filter(doc => doc.exists)
        .map(async doc => {
          const data = doc.data() as UniversityDocument;
          const classCount = (
            await this.db()
              .collection(
                `${UNIVERSITIES_COLLECTION}/${doc.id}/${CLASSES_SUBCOLLECTION}`,
              )
              .count()
              .get()
          ).data().count;
          return {
            id: doc.id,
            title: data.title,
            status: data.status,
            startDate: toIso(data.startDate) ?? "",
            endDate: toIso(data.endDate),
            classCount,
          };
        }),
    );

    return { universities: summaries };
  }

  async getDetail(
    caller: Caller,
    universityId: string,
  ): Promise<UniversityDetailResponse> {
    await assertChancellorOf(caller, universityId);

    const reference = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      throw new NotFoundError("University not found");
    }
    const doc = snapshot.data() as UniversityDocument;

    const classesSnapshot = await this.db()
      .collection(
        `${UNIVERSITIES_COLLECTION}/${universityId}/${CLASSES_SUBCOLLECTION}`,
      )
      .orderBy("createdAt")
      .get();

    return {
      university: {
        id: universityId,
        title: doc.title,
        status: doc.status,
        timezone: doc.timezone,
        startDate: toIso(doc.startDate) ?? "",
        endDate: toIso(doc.endDate),
        registrationOpensAt: toIso(doc.registrationOpensAt),
        registrationClosesAt: toIso(doc.registrationClosesAt) ?? "",
        location: doc.location,
        periods: doc.periods.map(p => ({
          periodId: p.periodId,
          label: p.label,
          startsAt: toIso(p.startsAt) ?? "",
          endsAt: toIso(p.endsAt) ?? "",
        })),
        createdByUid: doc.createdByUid,
        createdAt: toIso(doc.createdAt) ?? "",
        updatedAt: toIso(doc.updatedAt) ?? "",
      },
      classes: classesSnapshot.docs.map(classDoc =>
        toClassResponse(classDoc.id, classDoc.data() as ClassDocument),
      ),
    };
  }

  async remove(caller: Caller, universityId: string): Promise<void> {
    await assertChancellorOf(caller, universityId);

    const universityRef = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const snapshot = await universityRef.get();
    if (!snapshot.exists) {
      throw new NotFoundError("University not found");
    }
    assertDraftStatus((snapshot.data() as UniversityDocument).status);

    const classesSnapshot = await this.db()
      .collection(
        `${UNIVERSITIES_COLLECTION}/${universityId}/${CLASSES_SUBCOLLECTION}`,
      )
      .get();
    const grantsSnapshot = await this.db()
      .collection(ROLE_GRANTS_COLLECTION)
      .where("universityId", "==", universityId)
      .get();

    const batch = this.db().batch();
    for (const classDoc of classesSnapshot.docs) {
      batch.delete(classDoc.ref);
    }
    for (const grant of grantsSnapshot.docs) {
      batch.delete(grant.ref);
    }
    batch.delete(universityRef);
    await batch.commit();
  }
}

export const universitiesService = new UniversitiesServiceImpl();
