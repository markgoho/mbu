import { describe, expect, it } from "bun:test";
import { handleRequest } from "../test-utils/handle-request.js";
import { createApp } from "./app.js";
import type { SecretReader } from "./plugins/require-cron-secret.js";
import type { RetentionService } from "./services/retention/interface.js";

interface SetupOptions {
  /** Bearer header value; `null` sends no Authorization header. */
  authHeader?: string | null;
  /** Cron secret the app is configured to expect; `null` means unconfigured. */
  configuredSecret?: string | null;
  service?: Partial<RetentionService>;
}

function setup({
  authHeader = "Bearer test-secret",
  configuredSecret = "test-secret",
  service = {},
}: SetupOptions = {}) {
  const secretReader: SecretReader = () => configuredSecret ?? undefined;

  const retentionService: RetentionService = {
    purge: () =>
      Promise.resolve({ universitiesProcessed: 0, registrationsPurged: 0 }),
    ...service,
  };

  const app = createApp({ retentionService, secretReader });

  function request() {
    const headers: Record<string, string> = {};
    if (authHeader) headers["authorization"] = authHeader;
    return handleRequest(
      app,
      new Request("http://localhost/api/retention/purge", {
        method: "POST",
        headers,
      }),
    );
  }

  return { request };
}

describe("POST /api/retention/purge", () => {
  it("rejects a request with no Authorization header (401)", async () => {
    const { request } = setup({ authHeader: null });
    const response = await request();
    expect(response.status).toBe(401);
  });

  it("rejects a request with the wrong secret (401)", async () => {
    const { request } = setup({ authHeader: "Bearer wrong-secret" });
    const response = await request();
    expect(response.status).toBe(401);
  });

  it("rejects every request when no secret is configured", async () => {
    const { request } = setup({ configuredSecret: null });
    const response = await request();
    expect(response.status).toBe(401);
  });

  it("runs the purge and returns its counts with the correct secret", async () => {
    const { request } = setup({
      service: {
        purge: () =>
          Promise.resolve({ universitiesProcessed: 2, registrationsPurged: 5 }),
      },
    });
    const response = await request();
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      universitiesProcessed: number;
      registrationsPurged: number;
    };
    expect(body).toEqual({ universitiesProcessed: 2, registrationsPurged: 5 });
  });
});
