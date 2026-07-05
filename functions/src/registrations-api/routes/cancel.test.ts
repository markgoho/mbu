import { describe, expect, it } from "bun:test";
import {
  ERROR_CODES,
  NotFoundError,
} from "../../shared-api/errors/http-error.js";
import { handleRequest } from "../../test-utils/handle-request.js";
import type { RegistrationsService } from "../services/registrations/interface.js";
import {
  createRegistrationsTestPlugin,
  tokenVerifiers,
} from "../test-utils/create-registrations-test-plugin.js";

interface SetupOptions {
  authToken?: string | null;
  unverified?: boolean;
  cancel?: RegistrationsService["cancel"];
}

function setup({
  authToken = "Bearer x",
  unverified = false,
  cancel,
}: SetupOptions = {}) {
  const plugin = createRegistrationsTestPlugin({
    ...(unverified && { verifyToken: tokenVerifiers.unverified }),
    ...(cancel && { registrationsService: { cancel } }),
  });

  const headers: Record<string, string> = {};
  if (authToken) headers["authorization"] = authToken;

  const request = new Request(
    "http://localhost/registrations/uni1/cls1/scout1",
    { method: "DELETE", headers },
  );

  return { plugin, request };
}

describe("DELETE /api/registrations/:universityId/:classId/:scoutId", () => {
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

  it("returns 204 on a successful drop", async () => {
    const { plugin, request } = setup();
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(204);
  });

  it("maps a missing registration to 404", async () => {
    const { plugin, request } = setup({
      cancel: () => Promise.reject(new NotFoundError("Registration not found")),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(404);
  });
});
