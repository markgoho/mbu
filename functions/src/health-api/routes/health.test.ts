import { describe, expect, it } from "bun:test";
import { handleRequest } from "../../test-utils/handle-request.js";
import { createApp } from "../app.js";

function setup() {
  const testApp = createApp();
  const request = new Request("http://localhost/api/health", {
    method: "GET",
  });

  return { testApp, request };
}

describe("GET /api/health", () => {
  it("returns 200 status", async () => {
    const { testApp, request } = setup();

    const response = await handleRequest(testApp, request);

    expect(response.status).toBe(200);
  });

  it("returns ok status in body", async () => {
    const { testApp, request } = setup();

    const response = await handleRequest(testApp, request);
    const body = (await response.json()) as { status: string };

    expect(body.status).toBe("ok");
  });

  it("does not require authentication", async () => {
    const { testApp, request } = setup();

    const response = await handleRequest(testApp, request);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("ok");
  });
});
