/**
 * `bun run dev:platform`: the local event platform (#246). Starts Postgres,
 * the Firebase Auth emulator, the Go API on :8080 and the app dev server on
 * :4200, whose `/api` proxy goes to the Go API.
 *
 * `bun run dev:api` (`--no-app`): the same stack without the app dev server.
 *
 * Ctrl-C stops all of it and removes the container. If one process stops by
 * itself, the script stops the others too. Fill the database with
 * `bun run seed:platform` in a second terminal.
 */
import {
  API_PORT,
  APP_DIR,
  APP_PORT,
  AUTH_EMULATOR_HOST,
  REPO_ROOT,
  assertInstalled,
  startChild,
  startStack,
  stopStack,
} from "./lib/platform-stack.ts";

const withApp = !process.argv.includes("--no-app");

let stopping: Promise<void> | undefined;
function stop(exitCode: number) {
  stopping ??= (async () => {
    console.log("\nStopping the platform stack...");
    try {
      await stopStack();
    } finally {
      process.exit(exitCode);
    }
  })();
  return stopping;
}

function onUnexpectedExit(name: string) {
  console.error(`${name} stopped. Stopping the rest of the stack.`);
  void stop(1);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(signal, () => void stop(0));
}

try {
  assertInstalled(withApp ? [REPO_ROOT, APP_DIR] : [REPO_ROOT]);
  await startStack({ withApp, onUnexpectedExit });
  if (withApp) {
    // app/.env.development points the app at the Auth emulator.
    startChild("app dev server", "bun", ["run", "dev"], {
      cwd: APP_DIR,
      onUnexpectedExit,
    });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await stop(1);
}

console.log(`
Platform stack is up. Ctrl-C stops it.
  Go API          http://localhost:${API_PORT}/api/health
  Auth emulator   http://${AUTH_EMULATOR_HOST}${withApp ? `\n  App             http://localhost:${APP_PORT} (/api goes to the Go API)` : ""}
  Seed data       bun run seed:platform
`);
