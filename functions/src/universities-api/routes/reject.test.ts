import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  superAdmin,
  unverified,
  verified,
} from "../test-utils/create-universities-test-plugin.js";

function setup({
  id = "uni1",
  authToken = "admin-token",
  verifyToken = superAdmin,
}: {
  id?: string;
  authToken?: string | null;
  verifyToken?: typeof superAdmin;
} = {}) {
  const app = createUniversitiesTestPlugin({ verifyToken });
  const request = new Request(
    `http://localhost/api/admin/universities/${id}/reject`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ note: "Missing counselor disclaimers" }),
    },
  );
  return { app, request };
}

describe("POST /api/admin/universities/:id/reject", () => {
  it("transitions to rejected with the review note (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      reviewNote: string | null;
    };
    expect(body.status).toBe("rejected");
    expect(body.reviewNote).toBe("Missing counselor disclaimers");
  });

  it("returns 409 on an illegal transition", async () => {
    const { app, request } = setup({ id: "illegal-uni" });
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
