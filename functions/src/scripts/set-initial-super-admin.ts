/**
 * Grant the `superAdmin` custom claim to one account. Run once to bootstrap the
 * first super-admin (#81 has no in-app super-admin management in v1). The target
 * account must already exist in Firebase Auth (sign in once first).
 *
 * Emulator:
 *   ADMIN_EMAIL=you@example.com bun run src/scripts/set-initial-super-admin.ts
 * Production:
 *   USE_EMULATOR=false ADMIN_EMAIL=you@example.com \
 *     bun run src/scripts/set-initial-super-admin.ts
 *   (requires GOOGLE_APPLICATION_CREDENTIALS for the project service account)
 *
 * The target's existing ID token is stale until they refresh (getIdToken(true))
 * or sign out and back in.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = "merit-badge-university";
const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] ?? "";
const ADMIN_UID = process.env["ADMIN_UID"] ?? "";
const USE_EMULATOR = process.env["USE_EMULATOR"] !== "false";

async function setInitialSuperAdmin(): Promise<void> {
  if (!ADMIN_EMAIL && !ADMIN_UID) {
    throw new Error("Set ADMIN_EMAIL (or ADMIN_UID) to the target account.");
  }

  if (USE_EMULATOR) {
    process.env["FIREBASE_AUTH_EMULATOR_HOST"] ??= "localhost:9099";
    process.env["GCLOUD_PROJECT"] ??= PROJECT_ID;
    console.log("🔧 Using the Firebase Auth emulator");
  }

  if (getApps().length === 0) {
    initializeApp({ projectId: PROJECT_ID });
  }

  const auth = getAuth();
  const user = ADMIN_UID
    ? await auth.getUser(ADMIN_UID)
    : await auth.getUserByEmail(ADMIN_EMAIL);

  const claims = { ...(user.customClaims ?? {}), superAdmin: true };
  await auth.setCustomUserClaims(user.uid, claims);

  const updated = await auth.getUser(user.uid);
  console.log(`✅ superAdmin set for ${updated.email} (${updated.uid})`);
  console.log("Custom claims:", updated.customClaims);
}

try {
  await setInitialSuperAdmin();
  process.exit(0);
} catch (error) {
  console.error("❌ Failed to set superAdmin claim:", error);
  process.exit(1);
}
