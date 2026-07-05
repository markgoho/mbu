import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import {
  createUniversitiesTestPlugin,
  unverified,
} from "../test-utils/create-universities-test-plugin.js";

const validBody = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Spring MBU",
  timezone: "America/New_York",
  startDate: "2026-06-01T12:00:00.000Z",
  registrationClosesAt: "2026-05-25T23:59:59.000Z",
  location: {
    name: "Scout Hall",
    address: "1 Main St",
    city: "Anytown",
    state: "NY",
    zip: "12345",
  },
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
  const request = new Request("http://localhost/api/universities", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(validBody),
  });
  return { app, request };
}

describe("POST /api/universities", () => {
  it("creates a university (200)", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string };
    expect(body.id).toBe(validBody.id);
    expect(body.status).toBe("draft");
  });

  it("returns 401 without an Authorization header", async () => {
    const { app, request } = setup({ authToken: null });
    const response = await handleRequest(app, request);
    expect(response.status).toBe(401);
  });

  it("returns 403 EMAIL_NOT_VERIFIED for an unverified email", async () => {
    const { app, request } = setup({ verifyToken: unverified });
    const response = await handleRequest(app, request);
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
  });
});
