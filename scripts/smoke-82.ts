/**
 * #82 emulator smoke pass (V2/V3). Requires auth + firestore + functions emulators
 * and Angular dev server (proxy to functions).
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const AUTH = "http://127.0.0.1:9099";
const API = "http://localhost:4200/api";
const KEY = "fake-api-key";
const PASSWORD = "password123";
const PROJECT = "merit-badge-university";

process.env["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8090";

interface AuthSession {
  uid: string;
  email: string;
  idToken: string;
}

async function authSignUp(email: string): Promise<AuthSession> {
  const res = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  if (!res.ok) throw new Error(`signUp failed: ${await res.text()}`);
  const body = (await res.json()) as {
    localId: string;
    idToken: string;
  };
  await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=${KEY}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer owner",
      },
      body: JSON.stringify({
        localId: body.localId,
        emailVerified: true,
      }),
    },
  );
  const signIn = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  if (!signIn.ok) throw new Error(`signIn failed: ${await signIn.text()}`);
  const signedIn = (await signIn.json()) as {
    localId: string;
    idToken: string;
  };
  return { uid: signedIn.localId, email, idToken: signedIn.idToken };
}

async function api(
  token: string | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function onboard(session: AuthSession): Promise<void> {
  const bootstrap = await api(session.idToken, "POST", "/users/me", {});
  assert(bootstrap.ok, "bootstrap user");
  const patch = await api(session.idToken, "PATCH", "/users/me", {
    displayName: "Chancellor Pat",
    acceptedTerms: true,
  });
  assert(patch.ok, "onboard user");
}

async function main(): Promise<void> {
  console.log("\n=== V2 Happy path ===\n");

  if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT });
  }
  const db = getFirestore();

  const chancellor = await authSignUp(
    `chancellor-${Date.now()}@smoke.test`,
  );
  await onboard(chancellor);

  const uniId = crypto.randomUUID();
  const createRes = await api(chancellor.idToken, "POST", "/universities", {
    id: uniId,
    title: "Smoke Test MBU",
    timezone: "America/New_York",
    startDate: "2026-08-15T14:00:00.000Z",
    registrationClosesAt: "2026-08-10T23:59:59.000Z",
    location: {
      name: "Scout Hall",
      address: "1 Main St",
      city: "Anytown",
      state: "NY",
      zip: "12345",
    },
  });
  assert(createRes.ok, `create university (${createRes.status})`);
  const created = (await createRes.json()) as { status: string; id: string };
  assert(created.status === "draft", "university status is draft");
  assert(created.id === uniId, "university id matches client mint");

  const uniDoc = await db.collection("universities").doc(uniId).get();
  assert(uniDoc.exists, "universities/{id} doc exists");
  assert(
    uniDoc.data()?.status === "draft",
    "Firestore university status draft",
  );
  assert(
    uniDoc.data()?.createdByUid === chancellor.uid,
    "createdByUid set on university",
  );

  const grantId = `${uniId}:chancellor:${chancellor.uid}`;
  const grantDoc = await db.collection("roleGrants").doc(grantId).get();
  assert(grantDoc.exists, "chancellor roleGrant exists");
  assert(grantDoc.data()?.status === "active", "chancellor grant active");

  const periodRes = await api(
    chancellor.idToken,
    "PUT",
    `/universities/${uniId}/periods`,
    {
      periods: [
        {
          label: "Morning",
          startsAt: "2026-08-15T08:00:00.000Z",
          endsAt: "2026-08-15T12:00:00.000Z",
        },
      ],
    },
  );
  assert(periodRes.ok, "put periods");
  const periodsBody = (await periodRes.json()) as {
    periods: { periodId: string }[];
  };
  const periodId = periodsBody.periods[0]?.periodId;
  assert(!!periodId, "server minted periodId");

  const refreshedUni = await db.collection("universities").doc(uniId).get();
  assert(
    (refreshedUni.data()?.periods as unknown[])?.length === 1,
    "periods[] on university doc",
  );

  const classRes = await api(
    chancellor.idToken,
    "POST",
    `/universities/${uniId}/classes`,
    {
      badgeSlug: "camping",
      periodIds: [periodId],
      capacity: 20,
      counselor: { bsaId: "123456789", acceptDisclaimer: true },
    },
  );
  assert(classRes.ok, `create class (${classRes.status})`);
  const classBody = (await classRes.json()) as {
    classId: string;
    badgeTitle: string;
    eagleRequired: boolean;
    enrolledCount: number;
    counselors: {
      bsaId: string;
      disclaimerVersion: string;
      disclaimerAcceptedAt: string;
    }[];
  };
  assert(classBody.badgeTitle === "Camping", "derived badgeTitle");
  assert(classBody.eagleRequired === true, "derived eagleRequired");
  assert(classBody.enrolledCount === 0, "enrolledCount=0");

  const classDoc = await db
    .collection(`universities/${uniId}/classes`)
    .doc(classBody.classId)
    .get();
  assert(classDoc.exists, "class doc exists");
  const counselorGrant = await db
    .collection("roleGrants")
    .doc(`${classBody.classId}:counselor:${chancellor.uid}`)
    .get();
  assert(counselorGrant.exists, "counselor roleGrant coterminous with class");

  const intruder = await authSignUp(`intruder-${Date.now()}@smoke.test`);
  await onboard(intruder);
  const forbidden = await api(
    intruder.idToken,
    "GET",
    `/universities/${uniId}`,
  );
  assert(forbidden.status === 403, "non-chancellor GET detail → 403");

  console.log("\n=== V3 Error / edge paths ===\n");

  const badTz = await api(chancellor.idToken, "POST", "/universities", {
    id: crypto.randomUUID(),
    title: "Bad TZ",
    timezone: "Not/A/Zone",
    startDate: "2026-08-15T14:00:00.000Z",
    registrationClosesAt: "2026-08-10T23:59:59.000Z",
    location: {
      name: "X",
      address: "X",
      city: "X",
      state: "X",
      zip: "X",
    },
  });
  assert(badTz.status === 400, "bad IANA tz → 400");

  const badDates = await api(chancellor.idToken, "POST", "/universities", {
    id: crypto.randomUUID(),
    title: "Bad dates",
    timezone: "America/New_York",
    startDate: "2026-08-20T14:00:00.000Z",
    endDate: "2026-08-15T14:00:00.000Z",
    registrationClosesAt: "2026-08-10T23:59:59.000Z",
    location: {
      name: "X",
      address: "X",
      city: "X",
      state: "X",
      zip: "X",
    },
  });
  assert(badDates.status === 400, "endDate < startDate → 400");

  const badReg = await api(chancellor.idToken, "POST", "/universities", {
    id: crypto.randomUUID(),
    title: "Bad reg",
    timezone: "America/New_York",
    startDate: "2026-08-15T14:00:00.000Z",
    registrationOpensAt: "2026-08-12T00:00:00.000Z",
    registrationClosesAt: "2026-08-10T23:59:59.000Z",
    location: {
      name: "X",
      address: "X",
      city: "X",
      state: "X",
      zip: "X",
    },
  });
  assert(badReg.status === 400, "opensAt >= closesAt → 400");

  const badBadge = await api(
    chancellor.idToken,
    "POST",
    `/universities/${uniId}/classes`,
    {
      badgeSlug: "not-a-real-badge",
      periodIds: [periodId],
      capacity: 10,
      counselor: { bsaId: "111", acceptDisclaimer: true },
    },
  );
  assert(badBadge.status === 400, "unknown badgeSlug → 400");

  const badPeriod = await api(
    chancellor.idToken,
    "POST",
    `/universities/${uniId}/classes`,
    {
      badgeSlug: "hiking",
      periodIds: ["nonexistent-period"],
      capacity: 10,
      counselor: { bsaId: "111", acceptDisclaimer: true },
    },
  );
  assert(badPeriod.status === 400, "unknown periodId → 400");

  const removePeriodConflict = await api(
    chancellor.idToken,
    "PUT",
    `/universities/${uniId}/periods`,
    { periods: [] },
  );
  assert(removePeriodConflict.status === 409, "remove in-use period → 409");
  const conflictBody = (await removePeriodConflict.json()) as {
    details?: { classes: { classId: string }[] };
  };
  assert(
    (conflictBody.details?.classes.length ?? 0) > 0,
    "409 includes offending class ids",
  );

  const deleteClassRes = await api(
    chancellor.idToken,
    "DELETE",
    `/universities/${uniId}/classes/${classBody.classId}`,
  );
  assert(deleteClassRes.status === 204, "delete class → 204");
  const goneGrant = await db
    .collection("roleGrants")
    .doc(`${classBody.classId}:counselor:${chancellor.uid}`)
    .get();
  assert(!goneGrant.exists, "counselor grant removed with class");

  const deleteUni = await api(
    chancellor.idToken,
    "DELETE",
    `/universities/${uniId}`,
  );
  assert(deleteUni.status === 204, "delete draft university → 204");
  assert(
    !(await db.collection("universities").doc(uniId).get()).exists,
    "university doc gone",
  );
  assert(!(await db.collection("roleGrants").doc(grantId).get()).exists, "chancellor grant gone");
  const orphanGrants = await db
    .collection("roleGrants")
    .where("universityId", "==", uniId)
    .get();
  assert(orphanGrants.empty, "no orphaned grants for university");

  const unauth = await api(null, "GET", "/universities/mine");
  assert(unauth.status === 401, "unauthenticated → 401");

  const badgesRes = await api(chancellor.idToken, "GET", "/universities/badges");
  assert(badgesRes.ok, "GET /universities/badges via proxy");

  console.log("\n=== All smoke checks passed ===\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
