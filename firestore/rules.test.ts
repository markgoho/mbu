/**
 * Rules unit tests — prove the deny-all backstop actually denies (not just "compiles").
 * Run with bun via the emulator: `bun run test:firestore`.
 */
import { afterAll, beforeAll, describe, it } from "bun:test";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, setLogLevel } from "firebase/firestore";

// The deny-all rules make every client op fail by design; those expected failures
// log noisy PERMISSION_DENIED lines. Silence the SDK — assertFails is the assertion.
setLogLevel("silent");

let env: RulesTestEnvironment;

const [host, portStr] = (
  process.env["FIRESTORE_EMULATOR_HOST"] ?? "127.0.0.1:8090"
).split(":");

// One representative doc path per collection in the model.
const PATHS = [
  "users/alice",
  "users/alice/scouts/scout-amy",
  "universities/uni-spring",
  "universities/uni-spring/classes/cls-camping",
  "universities/uni-spring/classes/cls-camping/registrations/scout-amy",
  "roleGrants/uni-spring:chancellor:jane",
];

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "mbu-rules-test",
    firestore: {
      rules: await Bun.file("firestore.rules").text(),
      host,
      port: Number(portStr),
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe("firestore.rules deny-all backstop", () => {
  it("denies unauthenticated reads on every collection", async () => {
    const db = env.unauthenticatedContext().firestore();
    for (const p of PATHS) await assertFails(getDoc(doc(db, p)));
  });

  it("denies unauthenticated writes on every collection", async () => {
    const db = env.unauthenticatedContext().firestore();
    for (const p of PATHS) await assertFails(setDoc(doc(db, p), { x: 1 }));
  });

  it("denies authenticated reads on every collection", async () => {
    const db = env.authenticatedContext("alice").firestore();
    for (const p of PATHS) await assertFails(getDoc(doc(db, p)));
  });

  it("denies authenticated writes — even to the caller's own user doc", async () => {
    const db = env.authenticatedContext("alice").firestore();
    for (const p of PATHS) await assertFails(setDoc(doc(db, p), { x: 1 }));
  });
});
