import { describe, expect, it } from "bun:test";
import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { ClassDocument } from "../../../collections/classes.js";
import type { RegistrationDocument } from "../../../collections/registrations.js";
import type { ScoutDocument } from "../../../collections/scouts.js";
import type { UniversityDocument } from "../../../collections/universities.js";
import { POLICY_VERSION } from "../../../constants/privacy.js";
import {
  ERROR_CODES,
  ForbiddenError,
} from "../../../shared-api/errors/http-error.js";
import type { RoleGrantsReader } from "../../../shared-api/services/authz/role-grants-reader.js";
import type { ScoutOwnershipReader } from "../../../shared-api/services/authz/scout-ownership-reader.js";
import type { Caller } from "../../../shared-api/types/caller.js";
import type { Notifier } from "../notifier/interface.js";
import { RegistrationsServiceImpl } from "./index.js";

const caller: Caller = {
  uid: "parent1",
  email: "parent@example.com",
  emailVerified: true,
  // Bypasses the registration-window check so the fixture doesn't need real dates.
  superAdmin: true,
};

const university: UniversityDocument = {
  title: "Spring MBU",
  status: "published",
  timezone: "America/New_York",
  startDate: Timestamp.fromDate(new Date("2026-06-01T12:00:00.000Z")),
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: Timestamp.fromDate(
    new Date("2026-05-25T23:59:59.000Z"),
  ),
  location: {
    name: "Scout Hall",
    address: "1 Main St",
    city: "Anytown",
    state: "NY",
    zip: "12345",
  },
  periods: [],
  createdByUid: "u1",
  submittedAt: null,
  publishedAt: null,
  reviewNote: null,
  billing: null,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const classDoc: ClassDocument = {
  badgeSlug: "camping",
  badgeTitle: "Camping",
  eagleRequired: false,
  periodIds: ["p1"],
  capacity: 10,
  enrolledCount: 0,
  waitlistCount: 0,
  room: "Room A",
  notes: null,
  counselors: [],
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const scout: ScoutDocument = {
  firstName: "Alex",
  lastName: "Smith",
  unit: "Troop 1",
  council: null,
  district: null,
  ageBand: "12-13",
  bsaId: null,
  accommodations: null,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};

const scoutOwnership: ScoutOwnershipReader = {
  exists: () => Promise.resolve(true),
};
const roleGrants: RoleGrantsReader = {
  hasActiveGrant: () => Promise.resolve(false),
  listActiveClassGrants: () => Promise.resolve([]),
};
const notifier: Notifier = {
  registered: () => Promise.resolve(),
  promoted: () => Promise.resolve(),
};

function mockFirestore() {
  let registration: RegistrationDocument | null = null;

  const universityRef = {};
  const classRef = {};
  const userRef = {};
  const registrationRef = {
    get: () =>
      Promise.resolve({
        exists: registration !== null,
        data: () => registration,
      }),
  };

  const scoutRef = {};
  // `register()` reads this via `txn.get(conflictQuery)`, not `conflictQuery.get()`.
  const conflictQueryRef = { where: () => conflictQueryRef };

  const db = {
    collection(path: string) {
      if (path === "universities") return { doc: () => universityRef };
      if (path === "users") return { doc: () => userRef };
      throw new Error(`unexpected collection: ${path}`);
    },
    doc(path: string) {
      if (path.includes("/registrations/")) return registrationRef;
      if (path.includes("/classes/")) return classRef;
      if (path.includes("/scouts/")) return scoutRef;
      throw new Error(`unexpected doc: ${path}`);
    },
    collectionGroup() {
      return conflictQueryRef;
    },
    runTransaction(fn: (txn: unknown) => Promise<void>) {
      const txn = {
        get(ref: unknown) {
          if (ref === universityRef) {
            return Promise.resolve({ exists: true, data: () => university });
          }
          if (ref === classRef) {
            return Promise.resolve({ exists: true, data: () => classDoc });
          }
          if (ref === registrationRef) {
            return Promise.resolve({
              exists: registration !== null,
              data: () => registration,
            });
          }
          if (ref === userRef) {
            return Promise.resolve({ exists: false, data: () => null });
          }
          if (ref === scoutRef) {
            return Promise.resolve({ exists: true, data: () => scout });
          }
          if (ref === conflictQueryRef) {
            return Promise.resolve({ docs: [] });
          }
          throw new Error("unexpected txn.get");
        },
        set(ref: unknown, data: RegistrationDocument) {
          if (ref === registrationRef) registration = data;
        },
        update() {
          // Class-count updates aren't asserted on here.
        },
      };
      return fn(txn);
    },
  } as unknown as Firestore;

  return { db, getRegistration: () => registration };
}

describe("RegistrationsServiceImpl.register — consent", () => {
  it("rejects without writing a registration when acceptConsent is false", async () => {
    const { db, getRegistration } = mockFirestore();
    const service = new RegistrationsServiceImpl(
      db,
      notifier,
      scoutOwnership,
      roleGrants,
    );

    const attempt = service.register(caller, "uni1", "cls1", {
      scoutId: "scout1",
      acceptConsent: false,
    });
    await expect(attempt).rejects.toBeInstanceOf(ForbiddenError);
    await attempt.catch((error: ForbiddenError) => {
      expect(error.code).toBe(ERROR_CODES.CONSENT_REQUIRED);
    });
    expect(getRegistration()).toBeNull();
  });

  it("stamps acceptedPolicyVersion when the parent consents", async () => {
    const { db, getRegistration } = mockFirestore();
    const service = new RegistrationsServiceImpl(
      db,
      notifier,
      scoutOwnership,
      roleGrants,
    );

    const result = await service.register(caller, "uni1", "cls1", {
      scoutId: "scout1",
      acceptConsent: true,
    });

    expect(result.status).toBe("enrolled");
    expect(getRegistration()?.acceptedPolicyVersion).toBe(POLICY_VERSION);
    expect(getRegistration()?.parentConsentAt).not.toBeNull();
  });
});
