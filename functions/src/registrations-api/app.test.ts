import { describe, expect, it } from "bun:test";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  AuthError,
  ConflictError,
  ERROR_CODES,
  ForbiddenError,
  NotFoundError,
} from "../shared-api/errors/http-error.js";
import type { TokenVerifier } from "../shared-api/plugins/require-auth.js";
import { handleRequest } from "../test-utils/handle-request.js";
import { createApp } from "./app.js";
import type { RegistrationResponse } from "./schemas/registration-schemas.js";
import type { RegistrationsService } from "./services/registrations/interface.js";

const enrolledRegistration: RegistrationResponse = {
  scoutId: "scout1",
  classId: "cls1",
  universityId: "uni1",
  status: "enrolled",
  periodIds: ["p1"],
  badgeSlug: "camping",
  badgeTitle: "Camping",
  waitlistedAt: null,
  enrolledAt: "2026-07-01T00:00:00.000Z",
};

const waitlistedRegistration: RegistrationResponse = {
  ...enrolledRegistration,
  status: "waitlisted",
  enrolledAt: null,
  waitlistedAt: "2026-07-02T00:00:00.000Z",
};

interface SetupOptions {
  /** Bearer header value; `null` sends no Authorization header (401 case). */
  authToken?: string | null;
  /** Drives the token verifier — false models an unverified email (403). */
  emailVerified?: boolean;
  /** Override any subset of the mocked registrations service. */
  service?: Partial<RegistrationsService>;
}

function setup({
  authToken = "Bearer x",
  emailVerified = true,
  service = {},
}: SetupOptions = {}) {
  // Header-aware like the real verifier: a missing Authorization header is a
  // 401 before any email-verified (403) check runs.
  const verifyToken: TokenVerifier = header => {
    if (!header) {
      return Promise.reject(new AuthError("Missing Authorization header"));
    }
    return Promise.resolve({
      uid: "u1",
      email: "u1@example.com",
      email_verified: emailVerified,
    } as DecodedIdToken);
  };

  const registrationsService: RegistrationsService = {
    register: () => Promise.resolve(enrolledRegistration),
    cancel: () => Promise.resolve(),
    listSchedule: () => Promise.resolve({ registrations: [] }),
    ...service,
  };

  const app = createApp({ registrationsService, verifyToken });

  function request(path: string, method: string, body?: unknown) {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (authToken) headers["authorization"] = authToken;
    return handleRequest(
      app,
      new Request(`http://localhost${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  }

  return { request };
}

describe("registrations-api auth gate", () => {
  it("rejects a request with no Authorization header (401)", async () => {
    const { request } = setup({ authToken: null });
    const response = await request("/api/registrations/uni1", "GET");
    expect(response.status).toBe(401);
  });

  it("rejects an unverified email with 403 EMAIL_NOT_VERIFIED", async () => {
    const { request } = setup({ emailVerified: false });
    const response = await request("/api/registrations/uni1", "GET");
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
  });
});

describe("POST /api/registrations/:universityId/:classId", () => {
  it("returns the enrolled registration", async () => {
    const { request } = setup();
    const response = await request("/api/registrations/uni1/cls1", "POST", {
      scoutId: "scout1",
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as RegistrationResponse;
    expect(body).toEqual(enrolledRegistration);
  });

  it("returns a waitlisted registration when the class overflowed", async () => {
    const { request } = setup({
      service: { register: () => Promise.resolve(waitlistedRegistration) },
    });
    const response = await request("/api/registrations/uni1/cls1", "POST", {
      scoutId: "scout1",
      acceptWaitlist: true,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as RegistrationResponse;
    expect(body.status).toBe("waitlisted");
    expect(body.waitlistedAt).not.toBeNull();
  });

  it("maps a full class to 409 class_full", async () => {
    const { request } = setup({
      service: {
        register: () =>
          Promise.reject(
            new ConflictError(
              "This class is full",
              undefined,
              ERROR_CODES.CLASS_FULL,
            ),
          ),
      },
    });
    const response = await request("/api/registrations/uni1/cls1", "POST", {
      scoutId: "scout1",
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe(ERROR_CODES.CLASS_FULL);
  });

  it("maps a period conflict to 409 period_conflict with the conflicting class in details", async () => {
    const { request } = setup({
      service: {
        register: () =>
          Promise.reject(
            new ConflictError(
              "Overlapping period",
              { classId: "cls2", badgeTitle: "Cooking", periodIds: ["p1"] },
              ERROR_CODES.PERIOD_CONFLICT,
            ),
          ),
      },
    });
    const response = await request("/api/registrations/uni1/cls1", "POST", {
      scoutId: "scout1",
    });
    expect(response.status).toBe(409);
    const body = (await response.json()) as {
      code?: string;
      details?: { classId: string };
    };
    expect(body.code).toBe(ERROR_CODES.PERIOD_CONFLICT);
    expect(body.details?.classId).toBe("cls2");
  });

  it("maps a closed registration window to 403 registration_closed", async () => {
    const { request } = setup({
      service: {
        register: () =>
          Promise.reject(
            new ForbiddenError(
              "Registration is closed",
              ERROR_CODES.REGISTRATION_CLOSED,
            ),
          ),
      },
    });
    const response = await request("/api/registrations/uni1/cls1", "POST", {
      scoutId: "scout1",
    });
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe(ERROR_CODES.REGISTRATION_CLOSED);
  });

  it("rejects a body missing scoutId with 400", async () => {
    const { request } = setup();
    const response = await request("/api/registrations/uni1/cls1", "POST", {});
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/registrations/:universityId/:classId/:scoutId", () => {
  it("returns 204 on a successful drop", async () => {
    const { request } = setup();
    const response = await request(
      "/api/registrations/uni1/cls1/scout1",
      "DELETE",
    );
    expect(response.status).toBe(204);
  });

  it("maps a missing registration to 404", async () => {
    const { request } = setup({
      service: {
        cancel: () => Promise.reject(new NotFoundError("Registration not found")),
      },
    });
    const response = await request(
      "/api/registrations/uni1/cls1/scout1",
      "DELETE",
    );
    expect(response.status).toBe(404);
  });
});

describe("GET /api/registrations/:universityId", () => {
  it("returns an empty schedule", async () => {
    const { request } = setup();
    const response = await request("/api/registrations/uni1", "GET");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { registrations: unknown[] };
    expect(body.registrations).toEqual([]);
  });

  it("returns the parent's active registrations across scouts", async () => {
    const { request } = setup({
      service: {
        listSchedule: () =>
          Promise.resolve({
            registrations: [enrolledRegistration, waitlistedRegistration],
          }),
      },
    });
    const response = await request("/api/registrations/uni1", "GET");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      registrations: RegistrationResponse[];
    };
    expect(body.registrations).toEqual([
      enrolledRegistration,
      waitlistedRegistration,
    ]);
  });
});
