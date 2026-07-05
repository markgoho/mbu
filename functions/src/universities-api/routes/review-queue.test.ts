import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  superAdmin,
  unverified,
  verified,
} from "../test-utils/create-universities-test-plugin.js";

function setup({
  authToken = "admin-token",
  verifyToken = superAdmin,
}: {
  authToken?: string | null;
  verifyToken?: typeof superAdmin;
} = {}) {
  const app = createUniversitiesTestPlugin({ verifyToken });
  const request = new Request(
    "http://localhost/api/admin/universities/review-queue",
    {
      method: "GET",
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    },
  );
  return { app, request };
}

describe("GET /api/admin/universities/review-queue", () => {
  it("returns queued rows for a super-admin (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { universities: unknown[] };
    expect(body.universities).toHaveLength(1);
  });

  it("returns 401 without an Authorization header", async () => {
    const { app, request } = setup({ authToken: null });
    expect((await handleRequest(app, request)).status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const { app, request } = setup({ verifyToken: unverified });
    expect((await handleRequest(app, request)).status).toBe(403);
  });

  it("returns 403 for a verified non-super-admin", async () => {
    const { app, request } = setup({ verifyToken: verified });
    expect((await handleRequest(app, request)).status).toBe(403);
  });
});
