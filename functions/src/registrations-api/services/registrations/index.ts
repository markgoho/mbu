import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  classesPath,
  type ClassDocument,
} from "../../../collections/classes.js";
import {
  REGISTRATIONS_SUBCOLLECTION,
  registrationsPath,
  type RegistrationDocument,
} from "../../../collections/registrations.js";
import { scoutsPath, type ScoutDocument } from "../../../collections/scouts.js";
import {
  UNIVERSITIES_COLLECTION,
  type UniversityDocument,
} from "../../../collections/universities.js";
import {
  USERS_COLLECTION,
  type UserDocument,
} from "../../../collections/users.js";
import { POLICY_VERSION } from "../../../constants/privacy.js";
import {
  ConflictError,
  ERROR_CODES,
  ForbiddenError,
  NotFoundError,
} from "../../../shared-api/errors/http-error.js";
import {
  assertChancellorOf,
  assertOwnsScout,
} from "../../../shared-api/services/authz/assertions.js";
import { roleGrantsReader } from "../../../shared-api/services/authz/role-grants-reader.js";
import { scoutOwnershipReader } from "../../../shared-api/services/authz/scout-ownership-reader.js";
import { cancelRegistrationTxn } from "../../../shared-api/services/registrations/cancel-registration-txn.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  ClassRoster,
  RegisterRequest,
  RegistrationResponse,
  RosterResponse,
  RosterRow,
  ScheduleResponse,
} from "../../schemas/registration-schemas.js";
import { emailNotifier } from "../notifier/email-notifier.js";
import { toIso } from "../validation.js";
import { assertWindowOpen, computeBypassWindow } from "../window-policy.js";
import type { RegistrationsService } from "./interface.js";

function toRegistrationResponse(
  doc: RegistrationDocument,
): RegistrationResponse {
  return {
    scoutId: doc.scoutId,
    classId: doc.classId,
    universityId: doc.universityId,
    status: doc.status as "enrolled" | "waitlisted",
    periodIds: doc.periodIds,
    badgeSlug: doc.badgeSlug,
    badgeTitle: doc.badgeTitle,
    waitlistedAt: toIso(doc.waitlistedAt),
    enrolledAt: toIso(doc.enrolledAt),
  };
}

function toRosterRow(doc: RegistrationDocument): RosterRow {
  return {
    scoutId: doc.scoutId,
    scoutFirstName: doc.scoutFirstName,
    scoutLastName: doc.scoutLastName,
    scoutUnit: doc.scoutUnit,
    accommodations: doc.accommodations,
    parentName: doc.parentName,
    parentEmail: doc.parentEmail,
    consentReceived: doc.parentConsentAt != null,
    status: doc.status as "enrolled" | "waitlisted",
  };
}

async function register(
  caller: Caller,
  universityId: string,
  classId: string,
  request: RegisterRequest,
): Promise<RegistrationResponse> {
  const db = getFirestore();
  const universityRef = db
    .collection(UNIVERSITIES_COLLECTION)
    .doc(universityId);
  const classRef = db.doc(`${classesPath(universityId)}/${classId}`);
  const registrationRef = db.doc(
    `${registrationsPath(universityId, classId)}/${request.scoutId}`,
  );
  const scoutRef = db.doc(`${scoutsPath(caller.uid)}/${request.scoutId}`);
  const userRef = db.collection(USERS_COLLECTION).doc(caller.uid);

  // Set inside the transaction so the post-commit steps know whether a new
  // registration was actually created (fire the notifier) or this was an
  // idempotent no-op re-registration (skip it).
  let alreadyActive = false;

  await db.runTransaction(async txn => {
    const universitySnapshot = await txn.get(universityRef);
    if (!universitySnapshot.exists) {
      throw new NotFoundError("University not found");
    }
    const university = universitySnapshot.data() as UniversityDocument;

    const bypassWindow = await computeBypassWindow(
      caller,
      universityId,
      roleGrantsReader,
    );
    assertWindowOpen(university, bypassWindow, Timestamp.now());

    await assertOwnsScout(caller, request.scoutId, scoutOwnershipReader);

    const classSnapshot = await txn.get(classRef);
    if (!classSnapshot.exists) {
      throw new NotFoundError("Class not found");
    }
    const classDoc = classSnapshot.data() as ClassDocument;

    const existingSnapshot = await txn.get(registrationRef);
    // Re-registering an already-active seat is an idempotent no-op: return the
    // current state rather than erroring or double-counting. A prior
    // *cancelled* doc is overwritten below but keeps its original createdAt.
    let priorCreatedAt: Timestamp | null = null;
    if (existingSnapshot.exists) {
      const existing = existingSnapshot.data() as RegistrationDocument;
      if (existing.status === "enrolled" || existing.status === "waitlisted") {
        alreadyActive = true;
        return;
      }
      priorCreatedAt = existing.createdAt;
    }

    if (request.acceptConsent !== true) {
      throw new ForbiddenError(
        "Parental consent required",
        ERROR_CODES.CONSENT_REQUIRED,
      );
    }

    const conflictQuery = db
      .collectionGroup(REGISTRATIONS_SUBCOLLECTION)
      .where("scoutId", "==", request.scoutId)
      .where("universityId", "==", universityId)
      .where("status", "in", ["enrolled", "waitlisted"]);
    const conflictSnapshot = await txn.get(conflictQuery);
    for (const doc of conflictSnapshot.docs) {
      const other = doc.data() as RegistrationDocument;
      if (other.classId === classId) continue;
      const overlaps = other.periodIds.some(id =>
        classDoc.periodIds.includes(id),
      );
      if (overlaps) {
        throw new ConflictError(
          "This scout is already registered for an overlapping period",
          {
            classId: other.classId,
            badgeTitle: other.badgeTitle,
            periodIds: other.periodIds,
          },
          ERROR_CODES.PERIOD_CONFLICT,
        );
      }
    }

    const scoutSnapshot = await txn.get(scoutRef);
    if (!scoutSnapshot.exists) {
      throw new NotFoundError("Scout not found");
    }
    const scout = scoutSnapshot.data() as ScoutDocument;

    const userSnapshot = await txn.get(userRef);
    const user = userSnapshot.exists
      ? (userSnapshot.data() as UserDocument)
      : null;

    const now = Timestamp.now();
    let status: "enrolled" | "waitlisted";
    let enrolledAt: Timestamp | null = null;
    let waitlistedAt: Timestamp | null = null;
    const classUpdates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (classDoc.enrolledCount < classDoc.capacity) {
      status = "enrolled";
      enrolledAt = now;
      classUpdates["enrolledCount"] = FieldValue.increment(1);
    } else if (request.acceptWaitlist) {
      status = "waitlisted";
      waitlistedAt = now;
      classUpdates["waitlistCount"] = FieldValue.increment(1);
    } else {
      throw new ConflictError(
        "This class is full",
        undefined,
        ERROR_CODES.CLASS_FULL,
      );
    }

    const registration: RegistrationDocument = {
      scoutId: request.scoutId,
      parentUid: caller.uid,
      universityId,
      classId,
      periodIds: classDoc.periodIds,
      badgeSlug: classDoc.badgeSlug,
      badgeTitle: classDoc.badgeTitle,
      scoutFirstName: scout.firstName,
      scoutLastName: scout.lastName,
      scoutUnit: scout.unit,
      accommodations: scout.accommodations,
      parentName: user?.displayName ?? caller.email,
      parentEmail: user?.email ?? caller.email,
      status,
      waitlistedAt,
      enrolledAt,
      parentConsentAt: now,
      acceptedPolicyVersion: POLICY_VERSION,
      purgedAt: null,
      createdAt: priorCreatedAt ?? now,
      updatedAt: now,
    };

    txn.set(registrationRef, registration);
    txn.update(classRef, classUpdates);
  });

  const written = await registrationRef.get();
  const registration = written.data() as RegistrationDocument;

  if (!alreadyActive) {
    try {
      await emailNotifier.registered({
        universityId,
        classId,
        scoutId: registration.scoutId,
        parentUid: registration.parentUid,
        badgeTitle: registration.badgeTitle,
        status: registration.status as "enrolled" | "waitlisted",
      });
    } catch (error) {
      // Notification failures must not fail the registration itself.
      logger.error("notifier.registered failed", { error });
    }
  }

  return toRegistrationResponse(registration);
}

async function cancel(
  caller: Caller,
  universityId: string,
  classId: string,
  scoutId: string,
): Promise<void> {
  const db = getFirestore();
  const universityRef = db
    .collection(UNIVERSITIES_COLLECTION)
    .doc(universityId);
  const registrationRef = db.doc(
    `${registrationsPath(universityId, classId)}/${scoutId}`,
  );

  let promotedScoutId: string | null = null;

  await db.runTransaction(async txn => {
    const universitySnapshot = await txn.get(universityRef);
    if (!universitySnapshot.exists) {
      throw new NotFoundError("University not found");
    }
    const university = universitySnapshot.data() as UniversityDocument;

    const bypassWindow = await computeBypassWindow(
      caller,
      universityId,
      roleGrantsReader,
    );
    // Drops only care about the close deadline (not published/opensAt): a
    // parent can always cancel while registration is open, and privileged
    // callers bypass even the deadline (post-close roster fixes).
    if (
      !bypassWindow &&
      Timestamp.now().toMillis() > university.registrationClosesAt.toMillis()
    ) {
      throw new ForbiddenError(
        "Registration is closed",
        ERROR_CODES.REGISTRATION_CLOSED,
      );
    }

    await assertOwnsScout(caller, scoutId, scoutOwnershipReader);

    const registrationSnapshot = await txn.get(registrationRef);
    if (!registrationSnapshot.exists) {
      throw new NotFoundError("Registration not found");
    }
    const registration = registrationSnapshot.data() as RegistrationDocument;
    if (registration.status === "cancelled") {
      throw new NotFoundError("Registration not found");
    }

    const result = await cancelRegistrationTxn(txn, db, {
      universityId,
      classId,
      registrationRef,
      registration,
    });
    promotedScoutId = result.promotedScoutId;
  });

  if (promotedScoutId) {
    try {
      const promotedSnapshot = await db
        .doc(`${registrationsPath(universityId, classId)}/${promotedScoutId}`)
        .get();
      const promoted = promotedSnapshot.data() as RegistrationDocument;
      await emailNotifier.promoted({
        universityId,
        classId,
        scoutId: promoted.scoutId,
        parentUid: promoted.parentUid,
        badgeTitle: promoted.badgeTitle,
      });
    } catch (error) {
      logger.error("notifier.promoted failed", { error });
    }
  }
}

async function listSchedule(
  caller: Caller,
  universityId: string,
): Promise<ScheduleResponse> {
  const db = getFirestore();
  const scheduleQuery = db
    .collectionGroup(REGISTRATIONS_SUBCOLLECTION)
    .where("parentUid", "==", caller.uid)
    .where("universityId", "==", universityId)
    .where("status", "in", ["enrolled", "waitlisted"]);
  const snapshot = await scheduleQuery.get();
  const registrations = snapshot.docs.map(doc =>
    toRegistrationResponse(doc.data() as RegistrationDocument),
  );
  return { registrations };
}

async function listRoster(
  caller: Caller,
  universityId: string,
): Promise<RosterResponse> {
  const db = getFirestore();
  const universitySnapshot = await db
    .collection(UNIVERSITIES_COLLECTION)
    .doc(universityId)
    .get();
  if (!universitySnapshot.exists) {
    throw new NotFoundError("University not found");
  }
  const university = universitySnapshot.data() as UniversityDocument;
  const periodLabels = new Map(
    university.periods.map(period => [period.periodId, period.label]),
  );

  // Chancellors see every class; everyone else is scoped to their active
  // counselor grants. assertChancellorOf throws (403) on a non-chancellor,
  // so only that 403 is caught to fall through to the counselor path — any
  // other error (e.g. a transient Firestore read failure) must surface
  // rather than silently demote the caller to a narrower view.
  let classIds: string[] | "all";
  try {
    await assertChancellorOf(caller, universityId, roleGrantsReader);
    classIds = "all";
  } catch (error) {
    if (!(error instanceof ForbiddenError)) throw error;
    const granted = await roleGrantsReader.listActiveClassGrants({
      uid: caller.uid,
      universityId,
    });
    if (granted.length === 0) {
      throw new ForbiddenError(
        "You do not have access to any classes in this event",
      );
    }
    classIds = granted;
  }

  const classesSnapshot = await db.collection(classesPath(universityId)).get();
  const inScopeClasses = classesSnapshot.docs.filter(
    doc => classIds === "all" || classIds.includes(doc.id),
  );

  const registrationsSnapshot = await db
    .collectionGroup(REGISTRATIONS_SUBCOLLECTION)
    .where("universityId", "==", universityId)
    .where("status", "in", ["enrolled", "waitlisted"])
    .get();
  const rowsByClass = new Map<string, RegistrationDocument[]>();
  for (const doc of registrationsSnapshot.docs) {
    const registration = doc.data() as RegistrationDocument;
    const rows = rowsByClass.get(registration.classId) ?? [];
    rows.push(registration);
    rowsByClass.set(registration.classId, rows);
  }

  const classRosters: ClassRoster[] = inScopeClasses.map(doc => {
    const classDoc = doc.data() as ClassDocument;
    const rows = rowsByClass.get(doc.id) ?? [];
    const enrolled = rows
      .filter(row => row.status === "enrolled")
      .sort((a, b) =>
        a.scoutLastName === b.scoutLastName
          ? (a.scoutFirstName ?? "").localeCompare(b.scoutFirstName ?? "")
          : (a.scoutLastName ?? "").localeCompare(b.scoutLastName ?? ""),
      )
      .map(toRosterRow);
    const waitlisted = rows
      .filter(row => row.status === "waitlisted")
      .sort(
        (a, b) =>
          (a.waitlistedAt?.toMillis() ?? 0) - (b.waitlistedAt?.toMillis() ?? 0),
      )
      .map(toRosterRow);

    return {
      class: {
        classId: doc.id,
        badgeTitle: classDoc.badgeTitle,
        periodLabels: classDoc.periodIds.map(id => periodLabels.get(id) ?? id),
        room: classDoc.room,
        capacity: classDoc.capacity,
        enrolledCount: classDoc.enrolledCount,
        waitlistCount: classDoc.waitlistCount,
        counselorNames: classDoc.counselors.map(
          counselor => counselor.displayName,
        ),
      },
      enrolled,
      waitlisted,
    };
  });

  return {
    university: {
      title: university.title,
      startDate: university.startDate.toDate().toISOString(),
      endDate: toIso(university.endDate),
      location: university.location,
      timezone: university.timezone,
    },
    classRosters,
  };
}

export const registrationsService: RegistrationsService = {
  register,
  cancel,
  listSchedule,
  listRoster,
};
