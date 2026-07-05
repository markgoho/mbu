import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  unverified,
} from "../test-utils/create-universities-test-plugin.js";

const validBody = {
  badgeSlug: "camping",
  periodIds: ["p1"],
  capacity: 20,
  counselor: { bsaId: "123456789", acceptDisclaimer: true },
};

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
    "http://localhost/api/universities/uni1/classes",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(validBody),
    },
  );
  return { app, request };
}

describe("POST /api/universities/:id/classes", () => {
  it("creates a class (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { classId: string };
    expect(body.classId).toBe("cls1");
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
