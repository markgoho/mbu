import { describe, expect, it } from "bun:test";
import {
  ConflictError,
  ERROR_CODES,
  ForbiddenError,
} from "../../shared-api/errors/http-error.js";
import { handleRequest } from "../../test-utils/handle-request.js";
import type { RegistrationResponse } from "../schemas/registration-schemas.js";
import type { RegistrationsService } from "../services/registrations/interface.js";
import {
  createRegistrationsTestPlugin,
  sampleRegistration,
  tokenVerifiers,
} from "../test-utils/create-registrations-test-plugin.js";

const waitlistedRegistration: RegistrationResponse = {
  ...sampleRegistration,
  status: "waitlisted",
  enrolledAt: null,
  waitlistedAt: "2026-07-02T00:00:00.000Z",
};

interface SetupOptions {
  authToken?: string | null;
  unverified?: boolean;
  body?: Record<string, unknown>;
  register?: RegistrationsService["register"];
}

function setup({
  authToken = "Bearer x",
  unverified = false,
  body = { scoutId: "scout1", acceptConsent: true },
  register,
}: SetupOptions = {}) {
  const plugin = createRegistrationsTestPlugin({
    ...(unverified && { verifyToken: tokenVerifiers.unverified }),
    ...(register && { registrationsService: { register } }),
  });

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (authToken) headers["authorization"] = authToken;

  const request = new Request("http://localhost/registrations/uni1/cls1", {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return { plugin, request };
}

describe("POST /api/registrations/:universityId/:classId", () => {
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

  it("returns the enrolled registration on success", async () => {
    const { plugin, request } = setup();
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(200);
    const responseBody = (await response.json()) as RegistrationResponse;
    expect(responseBody).toEqual(sampleRegistration);
  });

  it("returns a waitlisted registration when the class overflowed", async () => {
    const { plugin, request } = setup({
      body: { scoutId: "scout1", acceptWaitlist: true, acceptConsent: true },
      register: () => Promise.resolve(waitlistedRegistration),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(200);
    const responseBody = (await response.json()) as RegistrationResponse;
    expect(responseBody.status).toBe("waitlisted");
    expect(responseBody.waitlistedAt).not.toBeNull();
  });

  it("maps missing parental consent to 403 consent_required", async () => {
    const { plugin, request } = setup({
      body: { scoutId: "scout1", acceptConsent: false },
      register: () =>
        Promise.reject(
          new ForbiddenError(
            "Parental consent required",
            ERROR_CODES.CONSENT_REQUIRED,
          ),
        ),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(403);
    const responseBody = (await response.json()) as { code?: string };
    expect(responseBody.code).toBe(ERROR_CODES.CONSENT_REQUIRED);
  });

  it("maps a full class to 409 class_full", async () => {
    const { plugin, request } = setup({
      register: () =>
        Promise.reject(
          new ConflictError(
            "This class is full",
            undefined,
            ERROR_CODES.CLASS_FULL,
          ),
        ),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(409);
    const responseBody = (await response.json()) as { code?: string };
    expect(responseBody.code).toBe(ERROR_CODES.CLASS_FULL);
  });

  it("maps a period conflict to 409 with the conflicting class in details", async () => {
    const { plugin, request } = setup({
      register: () =>
        Promise.reject(
          new ConflictError(
            "Overlapping period",
            { classId: "cls2", badgeTitle: "Cooking", periodIds: ["p1"] },
            ERROR_CODES.PERIOD_CONFLICT,
          ),
        ),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(409);
    const responseBody = (await response.json()) as {
      code?: string;
      details?: { classId: string };
    };
    expect(responseBody.code).toBe(ERROR_CODES.PERIOD_CONFLICT);
    expect(responseBody.details?.classId).toBe("cls2");
  });

  it("maps a closed registration window to 403 registration_closed", async () => {
    const { plugin, request } = setup({
      register: () =>
        Promise.reject(
          new ForbiddenError(
            "Registration is closed",
            ERROR_CODES.REGISTRATION_CLOSED,
          ),
        ),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(403);
    const responseBody = (await response.json()) as { code?: string };
    expect(responseBody.code).toBe(ERROR_CODES.REGISTRATION_CLOSED);
  });

  it("rejects a body missing acceptConsent with 400", async () => {
    const { plugin, request } = setup({ body: { scoutId: "scout1" } });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(400);
  });

  it("rejects a body missing scoutId with 400", async () => {
    const { plugin, request } = setup({ body: {} });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(400);
  });
});
