import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import type { SecretReader } from "../plugins/require-cron-secret.js";
import type { RetentionService } from "../services/retention/interface.js";
import {
  createRetentionTestPlugin,
  RETENTION_TEST_SECRET,
} from "../test-utils/create-retention-test-plugin.js";

interface SetupOptions {
  /** Bearer header value; `null` sends no Authorization header. */
  authHeader?: string | null;
  /** Overrides the configured cron secret; `null` leaves it unconfigured. */
  secretReader?: SecretReader | null;
  purge?: RetentionService["purge"];
}

function setup({
  authHeader = `Bearer ${RETENTION_TEST_SECRET}`,
  secretReader,
  purge,
}: SetupOptions = {}) {
  const plugin = createRetentionTestPlugin({
    ...(purge ? { retentionService: { purge } } : {}),
    ...(secretReader === null
      ? { secretReader: () => undefined }
      : secretReader
        ? { secretReader }
        : {}),
  });

  function request() {
    const headers: Record<string, string> = {};
    if (authHeader) headers["authorization"] = authHeader;
    return handleRequest(
      plugin,
      new Request("http://localhost/retention/purge", {
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

  it("rejects every request when no secret is configured (401)", async () => {
    const { request } = setup({ secretReader: null });
    const response = await request();
    expect(response.status).toBe(401);
  });

  it("runs the purge and returns its counts with the correct secret", async () => {
    const { request } = setup({
      purge: () =>
        Promise.resolve({ universitiesProcessed: 2, registrationsPurged: 5 }),
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
