import {
  FieldValue,
  getFirestore,
  Timestamp,
  type Firestore,
} from "firebase-admin/firestore";
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
import {
  roleGrantsReader,
  type RoleGrantsReader,
} from "../../../shared-api/services/authz/role-grants-reader.js";
import {
  scoutOwnershipReader,
  type ScoutOwnershipReader,
} from "../../../shared-api/services/authz/scout-ownership-reader.js";
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
import type { Notifier } from "../notifier/interface.js";
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

export class RegistrationsServiceImpl implements RegistrationsService {
  constructor(
    private readonly database?: Firestore,
    private readonly notifierPort: Notifier = emailNotifier,
    private readonly scoutOwnership: ScoutOwnershipReader = scoutOwnershipReader,
    private readonly roleGrants: RoleGrantsReader = roleGrantsReader,
  ) {}

  private db(): Firestore {
    return this.database ?? getFirestore();
  }

  async register(
    caller: Caller,
    universityId: string,
    classId: string,
    request: RegisterRequest,
  ): Promise<RegistrationResponse> {
    const universityRef = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const classRef = this.db().doc(`${classesPath(universityId)}/${classId}`);
    const registrationRef = this.db().doc(
      `${registrationsPath(universityId, classId)}/${request.scoutId}`,
    );
    const scoutRef = this.db().doc(
      `${scoutsPath(caller.uid)}/${request.scoutId}`,
    );
    const userRef = this.db().collection(USERS_COLLECTION).doc(caller.uid);

    // Set inside the transaction so the post-commit steps know whether a new
    // registration was actually created (fire the notifier) or this was an
    // idempotent no-op re-registration (skip it).
    let alreadyActive = false;

    await this.db().runTransaction(async txn => {
      const universitySnapshot = await txn.get(universityRef);
      if (!universitySnapshot.exists) {
        throw new NotFoundError("University not found");
      }
      const university = universitySnapshot.data() as UniversityDocument;

      const bypassWindow = await computeBypassWindow(
        caller,
        universityId,
        this.roleGrants,
      );
      assertWindowOpen(university, bypassWindow, Timestamp.now());

      await assertOwnsScout(caller, request.scoutId, this.scoutOwnership);

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
        if (
          existing.status === "enrolled" ||
          existing.status === "waitlisted"
        ) {
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

      const conflictQuery = this.db()
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
        await this.notifierPort.registered({
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

  async cancel(
    caller: Caller,
    universityId: string,
    classId: string,
    scoutId: string,
  ): Promise<void> {
    const universityRef = this.db()
      .collection(UNIVERSITIES_COLLECTION)
      .doc(universityId);
    const classRef = this.db().doc(`${classesPath(universityId)}/${classId}`);
    const registrationRef = this.db().doc(
      `${registrationsPath(universityId, classId)}/${scoutId}`,
    );

    let promotedScoutId: string | null = null;

    await this.db().runTransaction(async txn => {
      const universitySnapshot = await txn.get(universityRef);
      if (!universitySnapshot.exists) {
        throw new NotFoundError("University not found");
      }
      const university = universitySnapshot.data() as UniversityDocument;

      const bypassWindow = await computeBypassWindow(
        caller,
        universityId,
        this.roleGrants,
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

      await assertOwnsScout(caller, scoutId, this.scoutOwnership);

      const registrationSnapshot = await txn.get(registrationRef);
      if (!registrationSnapshot.exists) {
        throw new NotFoundError("Registration not found");
      }
      const registration = registrationSnapshot.data() as RegistrationDocument;
      if (registration.status === "cancelled") {
        throw new NotFoundError("Registration not found");
      }

      const now = Timestamp.now();

      if (registration.status === "enrolled") {
        const waitlistQuery = this.db()
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
    });

    if (promotedScoutId) {
      try {
        const promotedSnapshot = await this.db()
          .doc(`${registrationsPath(universityId, classId)}/${promotedScoutId}`)
          .get();
        const promoted = promotedSnapshot.data() as RegistrationDocument;
        await this.notifierPort.promoted({
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

  async listSchedule(
    caller: Caller,
    universityId: string,
  ): Promise<ScheduleResponse> {
    const scheduleQuery = this.db()
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

  async listRoster(
    caller: Caller,
    universityId: string,
  ): Promise<RosterResponse> {
    const universitySnapshot = await this.db()
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
      await assertChancellorOf(caller, universityId, this.roleGrants);
      classIds = "all";
    } catch (error) {
      if (!(error instanceof ForbiddenError)) throw error;
      const granted = await this.roleGrants.listActiveClassGrants({
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

    const classesSnapshot = await this.db()
      .collection(classesPath(universityId))
      .get();
    const inScopeClasses = classesSnapshot.docs.filter(
      doc => classIds === "all" || classIds.includes(doc.id),
    );

    const registrationsSnapshot = await this.db()
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
            (a.waitlistedAt?.toMillis() ?? 0) -
            (b.waitlistedAt?.toMillis() ?? 0),
        )
        .map(toRosterRow);

      return {
        class: {
          classId: doc.id,
          badgeTitle: classDoc.badgeTitle,
          periodLabels: classDoc.periodIds.map(
            id => periodLabels.get(id) ?? id,
          ),
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
}

export const registrationsService = new RegistrationsServiceImpl();
