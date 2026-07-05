import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  unverified,
} from "../test-utils/create-universities-test-plugin.js";

function setup({
  authToken = "test-token",
  verifyToken,
}: {
  authToken?: string | null;
  verifyToken?: typeof unverified;
} = {}) {
  const app = createUniversitiesTestPlugin(
    verifyToken ? { verifyToken } : undefined,
  );
  const request = new Request(
    "http://localhost/api/universities/uni1/classes/cls1",
    {
      method: "DELETE",
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    },
  );
  return { app, request };
}

describe("DELETE /api/universities/:id/classes/:classId", () => {
  it("deletes a class (204)", async () => {
    const { app, request } = setup();
    expect((await handleRequest(app, request)).status).toBe(204);
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
