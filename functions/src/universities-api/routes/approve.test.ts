import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  superAdmin,
  UNIVERSITY_IDS,
  unverified,
  verified,
} from "../test-utils/create-universities-test-plugin.js";

function setup({
  id = UNIVERSITY_IDS.DEFAULT,
  authToken = "admin-token",
  verifyToken = superAdmin,
}: {
  id?: string;
  authToken?: string | null;
  verifyToken?: typeof superAdmin;
} = {}) {
  const app = createUniversitiesTestPlugin({ verifyToken });
  const request = new Request(
    `http://localhost/api/admin/universities/${id}/approve`,
    {
      method: "POST",
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    },
  );
  return { app, request };
}

describe("POST /api/admin/universities/:id/approve", () => {
  it("transitions a submitted university to published (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("published");
  });

  it("returns 409 on an illegal transition", async () => {
    const { app, request } = setup({ id: UNIVERSITY_IDS.ILLEGAL_TRANSITION });
    expect((await handleRequest(app, request)).status).toBe(409);
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
