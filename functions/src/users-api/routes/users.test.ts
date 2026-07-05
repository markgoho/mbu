import { describe, expect, it } from "bun:test";
import {
  ERROR_CODES,
  ForbiddenError,
  NotFoundError,
} from "../../shared-api/errors/http-error.js";
import { handleRequest } from "../../test-utils/handle-request.js";
import type { UsersService } from "../services/users/interface.js";
import {
  createUsersTestPlugin,
  unverified,
} from "../test-utils/create-users-test-plugin.js";

function authed(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { authorization: "Bearer x", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function noAuth(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("POST /users/me (bootstrap)", () => {
  function setup(usersService?: Partial<UsersService>) {
    return {
      app: createUsersTestPlugin(usersService ? { usersService } : undefined),
    };
  }

  it("returns 401 without an Authorization header", async () => {
    const { app } = setup();
    const response = await handleRequest(app, noAuth("/users/me", "POST"));
    expect(response.status).toBe(401);
  });

  it("returns 403 EMAIL_NOT_VERIFIED for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(app, authed("/users/me", "POST"));
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
  });

  it("bootstraps and reports needsConsent", async () => {
    const { app } = setup();
    const response = await handleRequest(app, authed("/users/me", "POST"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      needsConsent: boolean;
      user: { uid: string };
    };
    expect(body.needsConsent).toBe(true);
    expect(body.user.uid).toBe("u1");
  });
});

describe("GET /users/me", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(app, noAuth("/users/me", "GET"));
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(app, authed("/users/me", "GET"));
    expect(response.status).toBe(403);
  });

  it("returns the caller's user doc", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(app, authed("/users/me", "GET"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { uid: string };
    expect(body.uid).toBe("u1");
  });

  it("maps a missing user doc to 404", async () => {
    const app = createUsersTestPlugin({
      usersService: {
        getMe: () => Promise.reject(new NotFoundError("User not found")),
      },
    });
    const response = await handleRequest(app, authed("/users/me", "GET"));
    expect(response.status).toBe(404);
  });
});

describe("PATCH /users/me (onboard)", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(
      app,
      noAuth("/users/me", "PATCH", { displayName: "Pat", acceptedTerms: true }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(
      app,
      authed("/users/me", "PATCH", { displayName: "Pat", acceptedTerms: true }),
    );
    expect(response.status).toBe(403);
  });

  it("records onboarding when terms are accepted", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(
      app,
      authed("/users/me", "PATCH", {
        displayName: "Pat Parent",
        acceptedTerms: true,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { displayName: string };
    expect(body.displayName).toBe("Pat Parent");
  });

  it("rejects a body without accepted terms (400)", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(
      app,
      authed("/users/me", "PATCH", { displayName: "Pat" }),
    );
    expect(response.status).toBe(400);
  });
});

describe("DELETE /users/me (delete account)", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(app, noAuth("/users/me", "DELETE"));
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(app, authed("/users/me", "DELETE"));
    expect(response.status).toBe(403);
  });

  it("deletes the account (204)", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(app, authed("/users/me", "DELETE"));
    expect(response.status).toBe(204);
  });

  it("maps an active-chancellor block to 403 close_events_first", async () => {
    const app = createUsersTestPlugin({
      usersService: {
        deleteAccount: () =>
          Promise.reject(
            new ForbiddenError(
              "Close your events first",
              ERROR_CODES.CLOSE_EVENTS_FIRST,
            ),
          ),
      },
    });
    const response = await handleRequest(app, authed("/users/me", "DELETE"));
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe(ERROR_CODES.CLOSE_EVENTS_FIRST);
  });
});

describe("POST /users/me/roster-export-ack", () => {
  it("returns 401 without an Authorization header", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(
      app,
      noAuth("/users/me/roster-export-ack", "POST"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(
      app,
      authed("/users/me/roster-export-ack", "POST"),
    );
    expect(response.status).toBe(403);
  });

  it("stamps rosterExportAckAt", async () => {
    const app = createUsersTestPlugin();
    const response = await handleRequest(
      app,
      authed("/users/me/roster-export-ack", "POST"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      rosterExportAckAt: string | null;
    };
    expect(body.rosterExportAckAt).not.toBeNull();
  });
});
