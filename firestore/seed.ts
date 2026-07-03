/**
 * Representative Firestore seed for the MBU data model (issue #80).
 *
 * Reusable in two ways:
 *   - Programmatically:  `import { seed } from "./seed"; await seed(db);`
 *   - As a CLI:          `bun firestore/seed.ts`  (targets the running emulator)
 *
 * SAFETY: refuses to run unless FIRESTORE_EMULATOR_HOST is set, so it can never
 * write junk into a real database. `firebase emulators:exec` sets it automatically.
 *
 * The dataset deliberately exercises every state the queries in #80 care about:
 * plural chancellors, plural counselors, a counselor across two universities,
 * an invited (not-yet-active) grant, a multi-period class, a full class with a
 * waitlist, and a cancelled registration.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import {
  CLASSES_SUBCOLLECTION,
  REGISTRATIONS_SUBCOLLECTION,
  ROLE_GRANTS_COLLECTION,
  UNIVERSITIES_COLLECTION,
  USERS_COLLECTION,
  roleGrantId,
  scoutsPath,
} from "../functions/src/collections/index.js";

const ts = (iso: string): Timestamp => Timestamp.fromDate(new Date(iso));
const EVENT = "2026-04-11T";

/** Fixed IDs so re-seeding is idempotent (documents are overwritten). */
export const IDS = {
  users: { alice: "alice", sam: "sam", kim: "kim", jane: "jane", bob: "bob" },
  scouts: { amy: "scout-amy", ben: "scout-ben" },
  unis: { spring: "uni-spring", fall: "uni-fall", review: "uni-review" },
  classes: {
    camping: "cls-camping",
    firstAid: "cls-firstaid",
    citizenship: "cls-citizenship",
    fallCooking: "cls-fall-cooking",
  },
} as const;

export function getEmulatorDb(): Firestore {
  if (!process.env["FIRESTORE_EMULATOR_HOST"]) {
    throw new Error(
      "Refusing to seed: FIRESTORE_EMULATOR_HOST is not set. Run via `bun run test:firestore` or `bun run seed:firestore` against a running emulator.",
    );
  }
  if (getApps().length === 0) {
    initializeApp({ projectId: "merit-badge-university" });
  }
  return getFirestore();
}

export async function seed(db: Firestore): Promise<typeof IDS> {
  const { users, scouts, unis, classes } = IDS;
  const b = db.batch();

  // Adults
  const user = (displayName: string, email: string) => ({
    displayName,
    email,
    phone: null,
    counselorProfile: null,
    acceptedTermsAt: ts(`${EVENT}00:00:00Z`),
    acceptedPrivacyAt: ts(`${EVENT}00:00:00Z`),
    createdAt: ts(`${EVENT}00:00:00Z`),
    updatedAt: ts(`${EVENT}00:00:00Z`),
  });
  b.set(db.doc(`${USERS_COLLECTION}/${users.alice}`), user("Alice P", "alice@example.com"));
  b.set(db.doc(`${USERS_COLLECTION}/${users.sam}`), user("Sam C", "sam@example.com"));
  b.set(db.doc(`${USERS_COLLECTION}/${users.kim}`), user("Kim C", "kim@example.com"));
  b.set(db.doc(`${USERS_COLLECTION}/${users.jane}`), user("Jane X", "jane@example.com"));
  b.set(db.doc(`${USERS_COLLECTION}/${users.bob}`), user("Bob X", "bob@example.com"));

  // Scouts (under Alice)
  const scout = (firstName: string, ageBand: string) => ({
    firstName,
    lastName: "P",
    unit: "Troop 123",
    council: null,
    district: null,
    ageBand,
    bsaId: null,
    accommodations: null,
    createdAt: ts(`${EVENT}00:00:00Z`),
    updatedAt: ts(`${EVENT}00:00:00Z`),
  });
  b.set(db.doc(`${scoutsPath(users.alice)}/${scouts.amy}`), scout("Amy", "12-13"));
  b.set(db.doc(`${scoutsPath(users.alice)}/${scouts.ben}`), scout("Ben", "14-15"));

  // Universities
  const period = (id: string, label: string, from: string, to: string) => ({
    periodId: id,
    label,
    startsAt: ts(`${EVENT}${from}Z`),
    endsAt: ts(`${EVENT}${to}Z`),
  });
  const uniBase = {
    timezone: "America/New_York",
    startDate: ts(`${EVENT}13:00:00Z`),
    endDate: null,
    registrationOpensAt: null,
    registrationClosesAt: ts("2026-04-01T00:00:00Z"),
    location: { name: "HS", address: "1 Main", city: "Town", state: "VA", zip: "22000" },
    createdByUid: IDS.users.jane,
    submittedAt: null,
    publishedAt: null,
    reviewNote: null,
    billing: null,
    createdAt: ts(`${EVENT}00:00:00Z`),
    updatedAt: ts(`${EVENT}00:00:00Z`),
  };
  b.set(db.doc(`${UNIVERSITIES_COLLECTION}/${unis.spring}`), {
    ...uniBase,
    title: "Spring MBU",
    status: "published",
    publishedAt: ts(`${EVENT}00:00:00Z`),
    periods: [
      period("p1", "Period 1", "13:00:00", "13:50:00"),
      period("p2", "Period 2", "14:00:00", "14:50:00"),
      period("p3", "Period 3", "15:00:00", "15:50:00"),
    ],
  });
  b.set(db.doc(`${UNIVERSITIES_COLLECTION}/${unis.fall}`), {
    ...uniBase,
    title: "Fall MBU",
    status: "draft",
    periods: [period("q1", "Period 1", "13:00:00", "13:50:00")],
  });
  b.set(db.doc(`${UNIVERSITIES_COLLECTION}/${unis.review}`), {
    ...uniBase,
    title: "Pending Review MBU",
    status: "submitted",
    submittedAt: ts(`${EVENT}09:00:00Z`),
    periods: [period("r1", "Period 1", "13:00:00", "13:50:00")],
  });

  // Classes
  const klass = (
    uni: string,
    id: string,
    badgeSlug: string,
    badgeTitle: string,
    periodIds: string[],
    capacity: number,
    enrolledCount: number,
    waitlistCount: number,
    counselors: { uid: string; displayName: string }[],
  ) => {
    b.set(db.doc(`${UNIVERSITIES_COLLECTION}/${uni}/${CLASSES_SUBCOLLECTION}/${id}`), {
      badgeSlug,
      badgeTitle,
      eagleRequired: false,
      periodIds,
      capacity,
      enrolledCount,
      waitlistCount,
      room: null,
      notes: null,
      counselors,
      createdAt: ts(`${EVENT}00:00:00Z`),
      updatedAt: ts(`${EVENT}00:00:00Z`),
    });
  };
  const sam = { uid: users.sam, displayName: "Sam C" };
  const kim = { uid: users.kim, displayName: "Kim C" };
  klass(unis.spring, classes.camping, "camping", "Camping", ["p1"], 1, 1, 1, [sam, kim]);
  klass(unis.spring, classes.firstAid, "first-aid", "First Aid", ["p2"], 10, 1, 0, [sam]);
  klass(unis.spring, classes.citizenship, "citizenship-in-the-community", "Citizenship", ["p2", "p3"], 10, 0, 0, [kim]);
  klass(unis.fall, classes.fallCooking, "cooking", "Cooking", ["q1"], 10, 0, 0, [sam]);

  // Registrations (doc id = scoutId)
  const reg = (
    uni: string,
    cls: string,
    scoutId: string,
    scoutFirstName: string,
    periodIds: string[],
    badgeSlug: string,
    badgeTitle: string,
    status: string,
    waitlistedAt: Timestamp | null,
    enrolledAt: Timestamp | null,
  ) => {
    b.set(
      db.doc(`${UNIVERSITIES_COLLECTION}/${uni}/${CLASSES_SUBCOLLECTION}/${cls}/${REGISTRATIONS_SUBCOLLECTION}/${scoutId}`),
      {
        scoutId,
        parentUid: users.alice,
        universityId: uni,
        classId: cls,
        periodIds,
        badgeSlug,
        badgeTitle,
        scoutFirstName,
        scoutLastName: "P",
        scoutUnit: "Troop 123",
        accommodations: null,
        parentName: "Alice P",
        parentEmail: "alice@example.com",
        status,
        waitlistedAt,
        enrolledAt,
        parentConsentAt: ts(`${EVENT}00:00:00Z`),
        createdAt: ts(`${EVENT}00:00:00Z`),
        updatedAt: ts(`${EVENT}00:00:00Z`),
      },
    );
  };
  reg(unis.spring, classes.camping, scouts.amy, "Amy", ["p1"], "camping", "Camping", "enrolled", null, ts(`${EVENT}08:00:00Z`));
  reg(unis.spring, classes.camping, scouts.ben, "Ben", ["p1"], "camping", "Camping", "waitlisted", ts(`${EVENT}08:05:00Z`), null);
  reg(unis.spring, classes.firstAid, scouts.amy, "Amy", ["p2"], "first-aid", "First Aid", "enrolled", null, ts(`${EVENT}08:01:00Z`));
  reg(unis.spring, classes.firstAid, scouts.ben, "Ben", ["p2"], "first-aid", "First Aid", "cancelled", null, null);

  // Role grants (deterministic ids)
  const grant = (
    scopeId: string,
    role: "chancellor" | "counselor",
    scopeType: "university" | "class",
    universityId: string,
    uid: string | null,
    invitedEmail: string | null,
    status: string,
  ) => {
    const id = roleGrantId(scopeId, role, uid ?? invitedEmail ?? "");
    b.set(db.doc(`${ROLE_GRANTS_COLLECTION}/${id}`), {
      role,
      scopeType,
      scopeId,
      universityId,
      uid,
      invitedEmail,
      status,
      createdAt: ts(`${EVENT}00:00:00Z`),
      updatedAt: ts(`${EVENT}00:00:00Z`),
    });
  };
  grant(unis.spring, "chancellor", "university", unis.spring, users.jane, null, "active");
  grant(unis.spring, "chancellor", "university", unis.spring, users.bob, null, "active");
  grant(classes.camping, "counselor", "class", unis.spring, users.sam, null, "active");
  grant(classes.camping, "counselor", "class", unis.spring, users.kim, null, "active");
  grant(classes.firstAid, "counselor", "class", unis.spring, users.sam, null, "active");
  grant(classes.fallCooking, "counselor", "class", unis.fall, users.sam, null, "active");
  grant(classes.citizenship, "counselor", "class", unis.spring, null, "newcoach@example.com", "invited");

  await b.commit();
  return IDS;
}

if (import.meta.main) {
  const db = getEmulatorDb();
  await seed(db);
  console.log(`Seeded ${process.env["FIRESTORE_EMULATOR_HOST"]} for project merit-badge-university.`);
}
