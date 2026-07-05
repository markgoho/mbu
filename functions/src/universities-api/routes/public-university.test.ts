import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import { createUniversitiesTestPlugin } from "../test-utils/create-universities-test-plugin.js";

function setup({ id = "uni1" }: { id?: string } = {}) {
  const app = createUniversitiesTestPlugin();
  const request = new Request(
    `http://localhost/api/universities/${id}/public`,
    { method: "GET" },
  );
  return { app, request };
}

describe("GET /api/universities/:id/public", () => {
  it("returns the public DTO without authentication", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body["id"]).toBe("uni1");
    expect(body).not.toHaveProperty("createdByUid");
    expect(body).not.toHaveProperty("status");
  });

  it("sets Cache-Control: no-store", async () => {
    const { app, request } = setup();
    const response = await handleRequest(app, request);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 404 for a non-published or missing university", async () => {
    const { app, request } = setup({ id: "missing-uni" });
    const response = await handleRequest(app, request);
    expect(response.status).toBe(404);
  });
});
