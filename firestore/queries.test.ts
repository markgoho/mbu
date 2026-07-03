/**
 * Query-conformance tests — seed the representative dataset, then run each of the 7
 * queries from #80 and assert the rows come back correctly.
 *
 * NOTE: the Firestore emulator does NOT enforce composite indexes, so these prove
 * query *logic*, not index coverage. To validate the deployed indexes themselves,
 * run the same queries against a real (throwaway) Firestore database.
 */
import { beforeAll, describe, expect, it } from "bun:test";
import type { Firestore } from "firebase-admin/firestore";
import { IDS, getEmulatorDb, seed } from "./seed.js";
import {
  REGISTRATIONS_SUBCOLLECTION,
  ROLE_GRANTS_COLLECTION,
  UNIVERSITIES_COLLECTION,
  classesPath,
} from "../functions/src/collections/index.js";

let db: Firestore;

beforeAll(async () => {
  db = getEmulatorDb();
  await seed(db);
});

describe("query conformance (logic only; emulator does not enforce indexes)", () => {
  it("1. moderation queue: universities status==submitted, submittedAt desc", async () => {
    const snap = await db
      .collection(UNIVERSITIES_COLLECTION)
      .where("status", "==", "submitted")
      .orderBy("submittedAt", "desc")
      .get();
    expect(snap.docs.map((d) => d.id)).toEqual([IDS.unis.review]);
  });

  it("2. dashboard: roleGrants uid==sam, role==counselor, scopeType==class, active", async () => {
    const snap = await db
      .collection(ROLE_GRANTS_COLLECTION)
      .where("uid", "==", IDS.users.sam)
      .where("role", "==", "counselor")
      .where("scopeType", "==", "class")
      .where("status", "==", "active")
      .get();
    expect(snap.size).toBe(3); // camping + firstAid (spring) + fallCooking (fall) — across universities
  });

  it("3. scope members: roleGrants scopeId==cls-camping, role==counselor, active", async () => {
    const snap = await db
      .collection(ROLE_GRANTS_COLLECTION)
      .where("scopeId", "==", IDS.classes.camping)
      .where("role", "==", "counselor")
      .where("status", "==", "active")
      .get();
    expect(snap.docs.map((d) => d.get("uid")).sort()).toEqual([
      IDS.users.kim,
      IDS.users.sam,
    ]);
  });

  it("4. invite claim: roleGrants invitedEmail==X, status==invited", async () => {
    const snap = await db
      .collection(ROLE_GRANTS_COLLECTION)
      .where("invitedEmail", "==", "newcoach@example.com")
      .where("status", "==", "invited")
      .get();
    expect(snap.size).toBe(1);
  });

  it("5. waitlist: registrations [collection] status==waitlisted, waitlistedAt asc", async () => {
    const snap = await db
      .collection(`${classesPath(IDS.unis.spring)}/${IDS.classes.camping}/${REGISTRATIONS_SUBCOLLECTION}`)
      .where("status", "==", "waitlisted")
      .orderBy("waitlistedAt", "asc")
      .get();
    expect(snap.docs.map((d) => d.id)).toEqual([IDS.scouts.ben]);
  });

  it("6. period-conflict [collection group]: scoutId==amy, universityId==spring, active", async () => {
    const snap = await db
      .collectionGroup(REGISTRATIONS_SUBCOLLECTION)
      .where("scoutId", "==", IDS.scouts.amy)
      .where("universityId", "==", IDS.unis.spring)
      .where("status", "in", ["enrolled", "waitlisted"])
      .get();
    expect(snap.size).toBe(2); // camping (p1) + firstAid (p2)
  });

  it("7. parent schedule [collection group]: parentUid==alice, universityId==spring, active", async () => {
    const snap = await db
      .collectionGroup(REGISTRATIONS_SUBCOLLECTION)
      .where("parentUid", "==", IDS.users.alice)
      .where("universityId", "==", IDS.unis.spring)
      .where("status", "in", ["enrolled", "waitlisted"])
      .get();
    // amy-camping(enrolled) + amy-firstAid(enrolled) + ben-camping(waitlisted); ben-firstAid cancelled excluded
    expect(snap.size).toBe(3);
  });
});
