/**
 * `bun run seed:platform`: fills the local stack with the seed fixtures
 * (api/cmd/seed). Start the stack first with `bun run dev:platform` or
 * `bun run dev:api`. A second run replaces the fixtures.
 */
import { execFileSync } from "node:child_process";
import {
  API_DIR,
  APP_DSN,
  AUTH_EMULATOR_HOST,
  PROJECT_ID,
} from "./lib/platform-stack.ts";

try {
  execFileSync("go", ["run", "./cmd/seed"], {
    cwd: API_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: APP_DSN,
      FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
      GCP_PROJECT_ID: PROJECT_ID,
    },
  });
} catch {
  // The seed printed its own error.
  process.exit(1);
}
