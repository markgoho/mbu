import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  unverified,
} from "../test-utils/create-universities-test-plugin.js";

function setup({
  id = "uni1",
  authToken = "test-token",
  verifyToken,
}: {
  id?: string;
  authToken?: string | null;
  verifyToken?: typeof unverified;
} = {}) {
  const app = createUniversitiesTestPlugin(
    verifyToken ? { verifyToken } : undefined,
  );
  const request = new Request(`http://localhost/api/universities/${id}/close`, {
    method: "POST",
    headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
  });
  return { app, request };
}

describe("POST /api/universities/:id/close", () => {
  it("transitions a published university to closed (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("closed");
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
});
