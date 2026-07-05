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
  const request = new Request(`http://localhost/api/universities/${id}`, {
    method: "GET",
    headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
  });
  return { app, request };
}

describe("GET /api/universities/:id", () => {
  it("returns university detail (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { university: { id: string } };
    expect(body.university.id).toBe("uni1");
  });

  it("returns 401 without an Authorization header", async () => {
    const { app, request } = setup({ authToken: null });
    expect((await handleRequest(app, request)).status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const { app, request } = setup({ verifyToken: unverified });
    expect((await handleRequest(app, request)).status).toBe(403);
  });

  it("propagates a 403 when the caller is not the chancellor", async () => {
    const { app, request } = setup({ id: "forbidden-uni" });
    expect((await handleRequest(app, request)).status).toBe(403);
  });
});
