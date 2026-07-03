import {
  FieldValue,
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
import { findBadge, MERIT_BADGES } from "../../../catalog/merit-badges.js";
import {
  CLASSES_SUBCOLLECTION,
  type ClassDocument,
} from "../../../collections/classes.js";
import {
  ROLE_GRANTS_COLLECTION,
  roleGrantId,
} from "../../../collections/role-grants.js";
import {
  UNIVERSITIES_COLLECTION,
  type UniversityDocument,
} from "../../../collections/universities.js";
import {
  USERS_COLLECTION,
  type UserDocument,
} from "../../../collections/users.js";
import { DISCLAIMER_VERSION } from "../../../constants/disclaimer.js";
import {
  NotFoundError,
  ValidationError,
} from "../../../shared-api/errors/http-error.js";
import { assertChancellorOf } from "../../../shared-api/services/authz/assertions.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  BadgeCatalogResponse,
  ClassCreateRequest,
  ClassPatchRequest,
  ClassResponse,
} from "../../schemas/class-schemas.js";
import { assertDraftStatus, toIso } from "../validation.js";
import type { ClassesService } from "./interface.js";

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

function validatePeriodIds(
  periodIds: string[],
  university: UniversityDocument,
): void {
  if (periodIds.length === 0) {
    throw new ValidationError("At least one periodId is required");
  }
  const validIds = new Set(university.periods.map(p => p.periodId));
  for (const id of periodIds) {
    if (!validIds.has(id)) {
      throw new ValidationError(`Unknown periodId: ${id}`);
    }
  }
}

export class ClassesServiceImpl implements ClassesService {
  constructor(private readonly database?: Firestore) {}

  private db(): Firestore {
    return this.database ?? getFirestore();
  }

  async create(
    caller: Caller,
    universityId: string,
    request: ClassCreateRequest,
  ): Promise<ClassResponse> {
    await assertChancellorOf(caller, universityId);

    const badge = findBadge(request.badgeSlug);
    if (!badge) {
      throw new ValidationError(`Unknown badge slug: ${request.badgeSlug}`);
    }

    const userSnapshot = await this.db()
      .collection(USERS_COLLECTION)
      .doc(caller.uid)
      .get();
    if (!userSnapshot.exists) {
      throw new NotFoundError("User not found");
    }
    const user = userSnapshot.data() as UserDocument;

    const universityRef = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const classRef = this.db()
      .collection(
        `${UNIVERSITIES_COLLECTION}/${universityId}/${CLASSES_SUBCOLLECTION}`,
      )
      .doc();
    const classId = classRef.id;
    const grantRef = this.db()
      .collection(ROLE_GRANTS_COLLECTION)
      .doc(roleGrantId(classId, "counselor", caller.uid));

    await this.db().runTransaction(async txn => {
      const uniSnapshot = await txn.get(universityRef);
      if (!uniSnapshot.exists) {
        throw new NotFoundError("University not found");
      }
      const university = uniSnapshot.data() as UniversityDocument;
      assertDraftStatus(university.status);
      validatePeriodIds(request.periodIds, university);

      const classDoc = {
        badgeSlug: badge.slug,
        badgeTitle: badge.title,
        eagleRequired: badge.eagleRequired,
        periodIds: request.periodIds,
        capacity: request.capacity,
        enrolledCount: 0,
        waitlistCount: 0,
        room: request.room ?? null,
        notes: request.notes ?? null,
        counselors: [
          {
            uid: caller.uid,
            displayName: user.displayName,
            bsaId: request.counselor.bsaId.trim(),
            disclaimerAcceptedAt: Timestamp.now(),
            disclaimerVersion: DISCLAIMER_VERSION,
          },
        ],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const grant = {
        role: "counselor" as const,
        scopeType: "class" as const,
        scopeId: classId,
        universityId,
        uid: caller.uid,
        invitedEmail: null,
        status: "active" as const,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      txn.set(classRef, classDoc);
      txn.set(grantRef, grant);
    });

    const written = await classRef.get();
    return toClassResponse(classId, written.data() as ClassDocument);
  }

  async patch(
    caller: Caller,
    universityId: string,
    classId: string,
    request: ClassPatchRequest,
  ): Promise<ClassResponse> {
    await assertChancellorOf(caller, universityId);

    const universityRef = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const classRef = this.db().doc(
      `${UNIVERSITIES_COLLECTION}/${universityId}/${CLASSES_SUBCOLLECTION}/${classId}`,
    );

    await this.db().runTransaction(async txn => {
      const [uniSnapshot, classSnapshot] = await Promise.all([
        txn.get(universityRef),
        txn.get(classRef),
      ]);
      if (!uniSnapshot.exists) {
        throw new NotFoundError("University not found");
      }
      if (!classSnapshot.exists) {
        throw new NotFoundError("Class not found");
      }

      const university = uniSnapshot.data() as UniversityDocument;
      assertDraftStatus(university.status);

      const updates: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (request.badgeSlug !== undefined) {
        const badge = findBadge(request.badgeSlug);
        if (!badge) {
          throw new ValidationError(`Unknown badge slug: ${request.badgeSlug}`);
        }
        updates["badgeSlug"] = badge.slug;
        updates["badgeTitle"] = badge.title;
        updates["eagleRequired"] = badge.eagleRequired;
      }

      if (request.periodIds !== undefined) {
        validatePeriodIds(request.periodIds, university);
        updates["periodIds"] = request.periodIds;
      }

      if (request.capacity !== undefined) {
        updates["capacity"] = request.capacity;
      }
      if (request.room !== undefined) {
        updates["room"] = request.room;
      }
      if (request.notes !== undefined) {
        updates["notes"] = request.notes;
      }

      txn.update(classRef, updates);
    });

    const refreshed = await classRef.get();
    return toClassResponse(classId, refreshed.data() as ClassDocument);
  }

  async remove(
    caller: Caller,
    universityId: string,
    classId: string,
  ): Promise<void> {
    await assertChancellorOf(caller, universityId);

    const universityRef = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const classRef = this.db().doc(
      `${UNIVERSITIES_COLLECTION}/${universityId}/${CLASSES_SUBCOLLECTION}/${classId}`,
    );

    await this.db().runTransaction(async txn => {
      const [uniSnapshot, classSnapshot] = await Promise.all([
        txn.get(universityRef),
        txn.get(classRef),
      ]);
      if (!uniSnapshot.exists) {
        throw new NotFoundError("University not found");
      }
      if (!classSnapshot.exists) {
        throw new NotFoundError("Class not found");
      }
      assertDraftStatus((uniSnapshot.data() as UniversityDocument).status);

      const grantsQuery = this.db()
        .collection(ROLE_GRANTS_COLLECTION)
        .where("scopeId", "==", classId)
        .where("role", "==", "counselor");
      const grants = await txn.get(grantsQuery);

      txn.delete(classRef);
      for (const grant of grants.docs) {
        txn.delete(grant.ref);
      }
    });
  }

  async listBadges(): Promise<BadgeCatalogResponse> {
    return {
      badges: MERIT_BADGES.map(b => ({
        slug: b.slug,
        title: b.title,
        eagleRequired: b.eagleRequired,
      })),
    };
  }
}

export const classesService = new ClassesServiceImpl();
