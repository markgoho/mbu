import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  unverified,
} from "../test-utils/create-universities-test-plugin.js";

const validBody = {
  periods: [
    {
      label: "Morning",
      startsAt: "2026-06-01T08:00:00.000Z",
      endsAt: "2026-06-01T12:00:00.000Z",
    },
  ],
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
    "http://localhost/api/universities/uni1/periods",
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(validBody),
    },
  );
  return { app, request };
}

describe("PUT /api/universities/:id/periods", () => {
  it("replaces the period set (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { periods: unknown[] };
    expect(body.periods).toHaveLength(1);
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
