/**
 * The local event-platform stack (#246): Postgres in a container, and the
 * Firebase Auth emulator and the Go API as host processes. A much smaller
 * version of ~/github/doula-cloud/app/e2e/stack.ts.
 *
 * `scripts/dev-platform.ts` starts and stops it. `scripts/seed-platform.ts`
 * reads the connection values from here. `api/docs/environment.md` lists
 * the values the API gets.
 */
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

export const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
export const API_DIR = path.join(REPO_ROOT, "api");
export const APP_DIR = path.join(REPO_ROOT, "app");

export const PROJECT_ID = "merit-badge-university";
export const AUTH_EMULATOR_HOST = "127.0.0.1:9099";
export const API_PORT = 8080;
export const APP_PORT = 4200;
export const DB_PORT = Number(process.env["DB_HOST_PORT"] ?? 15432);

/** The container superuser. Only the migrations and the role setup use it. */
const OWNER_DSN = `postgres://mbu:mbu@127.0.0.1:${DB_PORT}/mbu?sslmode=disable`;
/** The login the API and the seed use: a member of app_runtime (ADR 0002). */
export const APP_DSN = `postgres://app_dev:app_dev@127.0.0.1:${DB_PORT}/mbu?sslmode=disable`;

// `podman compose` and `docker compose` take the same arguments.
const CONTAINER_ENGINE = process.env["CONTAINER_ENGINE"] ?? "podman";
const COMPOSE_ARGS = [
  "compose",
  "-p",
  "mbu-dev",
  "-f",
  path.join(API_DIR, "compose.dev.yaml"),
];

const READY_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 10_000;

/** A host process the stack started, and what to call it in a log line. */
interface Child {
  name: string;
  process: ChildProcess;
  exited: Promise<void>;
}

const children: Child[] = [];
let binaryDir: string | undefined;

/**
 * Starts the stack in dependency order. It fails before it starts anything
 * when a port is in use, because a stale process from an earlier run would
 * answer in place of the new one.
 */
export async function startStack(options: {
  withApp: boolean;
  onUnexpectedExit: (name: string) => void;
}) {
  // Clears a container that a killed earlier run left behind, before the port check.
  compose(["down", "-v"]);
  await assertPortsFree(options.withApp);
  compose(["up", "-d"]);
  runMigrations();
  createAppDevRole();
  await startAuthEmulator(options.onUnexpectedExit);
  await startAPI(options.onUnexpectedExit);
}

/**
 * Stops each host process (its whole process group), then removes the
 * container and its volume. Each start is an empty database, as the Auth
 * emulator starts with no accounts.
 */
export async function stopStack() {
  await Promise.all(children.splice(0).reverse().map(stopChild));
  if (binaryDir) rmSync(binaryDir, { recursive: true, force: true });
  compose(["down", "-v"]);
}

/** Starts a host process in its own process group, so stopChild reaches its children too. */
export function startChild(
  name: string,
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    onUnexpectedExit: (name: string) => void;
  },
): Child {
  // stdin is ignored: a process in its own group that reads the terminal is stopped (SIGTTIN).
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: ["ignore", "inherit", "inherit"],
    detached: true,
  });
  const entry: Child = {
    name,
    process: child,
    exited: new Promise(resolve => {
      const onEnd = () => {
        if (children.includes(entry)) options.onUnexpectedExit(name);
        resolve();
      };
      child.once("exit", onEnd);
      // A spawn failure (ENOENT) emits "error" and no "exit".
      child.once("error", error => {
        console.error(`${name}: ${error.message}`);
        onEnd();
      });
    }),
  };
  children.push(entry);
  return entry;
}

async function stopChild(child: Child) {
  const pid = child.process.pid;
  if (
    pid === undefined ||
    child.process.exitCode !== null ||
    child.process.signalCode !== null
  )
    return;
  signalGroup(pid, "SIGINT");
  const timedOut = await Promise.race([
    child.exited.then(() => false),
    Bun.sleep(STOP_TIMEOUT_MS).then(() => true),
  ]);
  if (timedOut)
    console.warn(
      `${child.name} did not stop in ${STOP_TIMEOUT_MS} ms; killing it.`,
    );
  // The leader can exit before its children (the emulator's Java process).
  signalGroup(pid, "SIGKILL");
}

function signalGroup(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(-pid, signal);
  } catch {
    // The group is gone already.
  }
}

function compose(args: string[]) {
  execFileSync(CONTAINER_ENGINE, [...COMPOSE_ARGS, ...args], {
    stdio: "inherit",
    env: { ...process.env, DB_HOST_PORT: String(DB_PORT) },
  });
}

/** api/cmd/migrate waits up to 30 s for Postgres to accept connections. */
function runMigrations() {
  execFileSync("go", ["run", "./cmd/migrate"], {
    cwd: API_DIR,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: OWNER_DSN },
  });
}

/**
 * The migrations make app_runtime, a role with no login. On Cloud SQL a
 * login made by hand is its member (#259); locally that login is app_dev.
 */
function createAppDevRole() {
  const sql =
    "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_dev') THEN " +
    "CREATE ROLE app_dev LOGIN PASSWORD 'app_dev' IN ROLE app_runtime; END IF; END $$;";
  compose([
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    "mbu",
    "-d",
    "mbu",
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    sql,
  ]);
}

async function startAuthEmulator(onUnexpectedExit: (name: string) => void) {
  // The firebase CLI is a dependency of the repo root. It reads the port from firebase.json.
  startChild(
    "Auth emulator",
    path.join(REPO_ROOT, "node_modules/.bin/firebase"),
    ["emulators:start", "--only", "auth", "--project", PROJECT_ID],
    { cwd: REPO_ROOT, onUnexpectedExit },
  );
  await waitForHTTP(`http://${AUTH_EMULATOR_HOST}/`);
}

/**
 * Builds the binary and runs it, not `go run`: a `go run` child is a second
 * process that a stop signal to the first one does not always reach.
 */
async function startAPI(onUnexpectedExit: (name: string) => void) {
  binaryDir = mkdtempSync(path.join(tmpdir(), "mbu-api-"));
  const binary = path.join(binaryDir, "mbu-api");
  execFileSync("go", ["build", "-o", binary, "."], {
    cwd: API_DIR,
    stdio: "inherit",
  });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(API_PORT),
    DATABASE_URL: APP_DSN,
    FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
    GCP_PROJECT_ID: PROJECT_ID,
    // The local caller of /api/internal/** (ADR 0005): no metadata server
    // mints an OIDC token here. Deliberately unset on Cloud Run.
    INTERNAL_WORKER_SECRET: "local-worker-secret",
  };
  // Local mode sends no mail: without a key the API uses the fake sender (#257).
  delete env["MAILGUN_API_KEY"];

  startChild("Go API", binary, [], { cwd: API_DIR, env, onUnexpectedExit });
  await waitForHTTP(`http://127.0.0.1:${API_PORT}/api/health`);
}

async function assertPortsFree(withApp: boolean) {
  const [authHost = "", authPort = ""] = AUTH_EMULATOR_HOST.split(":");
  const ports: [string, string, number][] = [
    ["Postgres", "127.0.0.1", DB_PORT],
    ["Auth emulator", authHost, Number(authPort)],
    ["Go API", "127.0.0.1", API_PORT],
  ];
  if (withApp) ports.push(["app dev server", "localhost", APP_PORT]);
  for (const [name, host, port] of ports) {
    if (await isListening(host, port)) {
      throw new Error(
        `Port ${port} (${name}) is in use. Stop the process that holds it, then start again.`,
      );
    }
  }
}

function isListening(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = createConnection({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitForHTTP(url: string) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await Bun.sleep(500);
  }
  throw new Error(`${url} did not answer in ${READY_TIMEOUT_MS} ms.`);
}

/** Stops with a message when `bun install` has not run in a directory the stack needs. */
export function assertInstalled(directories: string[]) {
  for (const directory of directories) {
    if (!existsSync(path.join(directory, "node_modules"))) {
      throw new Error(
        `${directory}/node_modules is missing. Run \`bun install\` in ${directory} first.`,
      );
    }
  }
}
