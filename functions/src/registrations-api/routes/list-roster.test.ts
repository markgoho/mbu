import { describe, expect, it } from "bun:test";
import {
  ERROR_CODES,
  ForbiddenError,
  NotFoundError,
} from "../../shared-api/errors/http-error.js";
import { handleRequest } from "../../test-utils/handle-request.js";
import type { RosterResponse } from "../schemas/registration-schemas.js";
import type { RegistrationsService } from "../services/registrations/interface.js";
import {
  createRegistrationsTestPlugin,
  emptyRoster,
  tokenVerifiers,
} from "../test-utils/create-registrations-test-plugin.js";

interface SetupOptions {
  authToken?: string | null;
  unverified?: boolean;
  listRoster?: RegistrationsService["listRoster"];
}

function setup({
  authToken = "Bearer x",
  unverified = false,
  listRoster,
}: SetupOptions = {}) {
  const plugin = createRegistrationsTestPlugin({
    ...(unverified && { verifyToken: tokenVerifiers.unverified }),
    ...(listRoster && { registrationsService: { listRoster } }),
  });

  const headers: Record<string, string> = {};
  if (authToken) headers["authorization"] = authToken;

  const request = new Request("http://localhost/registrations/uni1/roster", {
    method: "GET",
    headers,
  });

  return { plugin, request };
}

describe("GET /api/registrations/:universityId/roster", () => {
  it("returns 401 when no Authorization header is sent", async () => {
    const { plugin, request } = setup({ authToken: null });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(401);
  });

  it("returns 403 EMAIL_NOT_VERIFIED for an unverified email", async () => {
    const { plugin, request } = setup({ unverified: true });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(403);
    const responseBody = (await response.json()) as { code?: string };
    expect(responseBody.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
  });

  it("returns the event's class rosters", async () => {
    const { plugin, request } = setup();
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(200);
    const responseBody = (await response.json()) as RosterResponse;
    expect(responseBody).toEqual(emptyRoster);
  });

  it("maps no accessible classes to 403", async () => {
    const { plugin, request } = setup({
      listRoster: () =>
        Promise.reject(
          new ForbiddenError(
            "You do not have access to any classes in this event",
          ),
        ),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(403);
  });

  it("maps a missing university to 404", async () => {
    const { plugin, request } = setup({
      listRoster: () =>
        Promise.reject(new NotFoundError("University not found")),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(404);
  });
});
