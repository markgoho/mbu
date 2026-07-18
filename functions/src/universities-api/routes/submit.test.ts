import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  UNIVERSITY_IDS,
  unverified,
} from "../test-utils/create-universities-test-plugin.js";

function setup({
  id = UNIVERSITY_IDS.DEFAULT,
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
  const request = new Request(
    `http://localhost/api/universities/${id}/submit`,
    {
      method: "POST",
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {},
    },
  );
  return { app, request };
}

describe("POST /api/universities/:id/submit", () => {
  it("transitions a draft to submitted (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("submitted");
  });

  it("returns 400 when the university has no classes", async () => {
    const { app, request } = setup({ id: UNIVERSITY_IDS.WITHOUT_CLASSES });
    expect((await handleRequest(app, request)).status).toBe(400);
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
});
