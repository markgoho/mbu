import { describe, expect, it } from "bun:test";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  ERROR_CODES,
  ForbiddenError,
} from "../shared-api/errors/http-error.js";
import type { TokenVerifier } from "../shared-api/plugins/require-auth.js";
import { handleRequest } from "../test-utils/handle-request.js";
import { createApp } from "./app.js";
import type { ScoutsService } from "./services/scouts/interface.js";
import type { UsersService } from "./services/users/interface.js";

const verified: TokenVerifier = () =>
  Promise.resolve({
    uid: "u1",
    email: "u1@example.com",
    email_verified: true,
  } as DecodedIdToken);

const unverified: TokenVerifier = () =>
  Promise.resolve({
    uid: "u1",
    email: "u1@example.com",
    email_verified: false,
  } as DecodedIdToken);

const usersService: UsersService = {
  bootstrap: caller =>
    Promise.resolve({
      user: {
        uid: caller.uid,
        displayName: "",
        email: caller.email,
        phone: null,
        acceptedTermsAt: null,
        acceptedPrivacyAt: null,
        acceptedPolicyVersion: null,
        rosterExportAckAt: null,
      },
      needsConsent: true,
    }),
  getMe: caller =>
    Promise.resolve({
      uid: caller.uid,
      displayName: "Pat",
      email: caller.email,
      phone: null,
      acceptedTermsAt: null,
      acceptedPrivacyAt: null,
      acceptedPolicyVersion: null,
      rosterExportAckAt: null,
    }),
  onboard: (caller, request) =>
    Promise.resolve({
      uid: caller.uid,
      displayName: request.displayName,
      email: caller.email,
      phone: null,
      acceptedTermsAt: "2026-07-03T00:00:00.000Z",
      acceptedPrivacyAt: "2026-07-03T00:00:00.000Z",
      acceptedPolicyVersion: "2026-07-04",
      rosterExportAckAt: null,
    }),
  ackRosterExport: caller =>
    Promise.resolve({
      uid: caller.uid,
      displayName: "Pat",
      email: caller.email,
      phone: null,
      acceptedTermsAt: "2026-07-03T00:00:00.000Z",
      acceptedPrivacyAt: "2026-07-03T00:00:00.000Z",
      acceptedPolicyVersion: "2026-07-04",
      rosterExportAckAt: "2026-07-05T00:00:00.000Z",
    }),
  deleteAccount: () => Promise.resolve(),
};

const scoutsService: ScoutsService = {
  list: () => Promise.resolve({ scouts: [] }),
  create: (_caller, request) =>
    Promise.resolve({
      scoutId: "s1",
      firstName: request.firstName,
      lastName: request.lastName,
      unit: request.unit ?? null,
      council: null,
      district: null,
      ageBand: null,
      bsaId: null,
      accommodations: null,
    }),
  update: (_caller, scoutId, request) =>
    Promise.resolve({
      scoutId,
      firstName: request.firstName,
      lastName: request.lastName,
      unit: null,
      council: null,
      district: null,
      ageBand: null,
      bsaId: null,
      accommodations: null,
    }),
  remove: () => Promise.resolve(),
};

function authed(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { authorization: "Bearer x", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("users-api auth gate", () => {
  it("rejects a request with no Authorization header (401)", async () => {
    const app = createApp({ usersService, scoutsService });
    const response = await handleRequest(
      app,
      new Request("http://localhost/api/users/me", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects an unverified email with 403 EMAIL_NOT_VERIFIED", async () => {
    const app = createApp({
      usersService,
      scoutsService,
      verifyToken: unverified,
    });
    const response = await handleRequest(app, authed("/api/users/me", "POST"));
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
  });
});

describe("users-api routes", () => {
  const app = () =>
    createApp({ usersService, scoutsService, verifyToken: verified });

  it("POST /api/users/me bootstraps and reports needsConsent", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me", "POST"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      needsConsent: boolean;
      user: { uid: string };
    };
    expect(body.needsConsent).toBe(true);
    expect(body.user.uid).toBe("u1");
  });

  it("PATCH /api/users/me records onboarding when terms are accepted", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me", "PATCH", {
        displayName: "Pat Parent",
        acceptedTerms: true,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { displayName: string };
    expect(body.displayName).toBe("Pat Parent");
  });

  it("PATCH /api/users/me rejects a body without accepted terms (400)", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me", "PATCH", { displayName: "Pat" }),
    );
    expect(response.status).toBe(400);
  });

  it("POST /api/users/me/scouts creates a scout", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me/scouts", "POST", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { scoutId: string };
    expect(body.scoutId).toBe("s1");
  });

  it("GET /api/users/me/scouts lists scouts", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me/scouts", "GET"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { scouts: unknown[] };
    expect(body.scouts).toEqual([]);
  });

  it("DELETE /api/users/me/scouts/:scoutId removes a scout", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me/scouts/s1", "DELETE"),
    );
    expect(response.status).toBe(204);
  });

  it("DELETE /api/users/me deletes the account", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me", "DELETE"),
    );
    expect(response.status).toBe(204);
  });

  it("DELETE /api/users/me maps an active-chancellor block to 403 close_events_first", async () => {
    const blockedApp = createApp({
      usersService: {
        ...usersService,
        deleteAccount: () =>
          Promise.reject(
            new ForbiddenError(
              "Close your events first",
              ERROR_CODES.CLOSE_EVENTS_FIRST,
            ),
          ),
      },
      scoutsService,
      verifyToken: verified,
    });
    const response = await handleRequest(
      blockedApp,
      authed("/api/users/me", "DELETE"),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe(ERROR_CODES.CLOSE_EVENTS_FIRST);
  });

  it("POST /api/users/me/roster-export-ack stamps rosterExportAckAt", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/users/me/roster-export-ack", "POST"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      rosterExportAckAt: string | null;
    };
    expect(body.rosterExportAckAt).not.toBeNull();
  });
});
