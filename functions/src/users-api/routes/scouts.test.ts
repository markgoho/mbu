import { describe, expect, it } from "bun:test";
import { NotFoundError } from "../../shared-api/errors/http-error.js";
import { handleRequest } from "../../test-utils/handle-request.js";
import type { ScoutsService } from "../services/scouts/interface.js";
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

function setup(scoutsService?: Partial<ScoutsService>) {
  return {
    app: createUsersTestPlugin(scoutsService ? { scoutsService } : undefined),
  };
}

describe("GET /users/me/scouts (list)", () => {
  it("returns 401 without an Authorization header", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      noAuth("/users/me/scouts", "GET"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(
      app,
      authed("/users/me/scouts", "GET"),
    );
    expect(response.status).toBe(403);
  });

  it("lists scouts", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      authed("/users/me/scouts", "GET"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { scouts: unknown[] };
    expect(body.scouts).toEqual([]);
  });
});

describe("POST /users/me/scouts (create)", () => {
  it("returns 401 without an Authorization header", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      noAuth("/users/me/scouts", "POST", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(
      app,
      authed("/users/me/scouts", "POST", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("creates a scout", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      authed("/users/me/scouts", "POST", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { scoutId: string };
    expect(body.scoutId).toBe("s1");
  });

  it("rejects a body missing required names (400)", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      authed("/users/me/scouts", "POST", { firstName: "Amy" }),
    );
    expect(response.status).toBe(400);
  });
});

describe("PATCH /users/me/scouts/:scoutId (update)", () => {
  it("returns 401 without an Authorization header", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      noAuth("/users/me/scouts/s1", "PATCH", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(
      app,
      authed("/users/me/scouts/s1", "PATCH", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("updates a scout", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      authed("/users/me/scouts/s9", "PATCH", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { scoutId: string };
    expect(body.scoutId).toBe("s9");
  });

  it("maps a missing scout to 404", async () => {
    const { app } = setup({
      update: () => Promise.reject(new NotFoundError("Scout not found")),
    });
    const response = await handleRequest(
      app,
      authed("/users/me/scouts/s1", "PATCH", {
        firstName: "Amy",
        lastName: "Scout",
      }),
    );
    expect(response.status).toBe(404);
  });
});

describe("DELETE /users/me/scouts/:scoutId (remove)", () => {
  it("returns 401 without an Authorization header", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      noAuth("/users/me/scouts/s1", "DELETE"),
    );
    expect(response.status).toBe(401);
  });

  it("returns 403 for an unverified email", async () => {
    const app = createUsersTestPlugin({ verifyToken: unverified });
    const response = await handleRequest(
      app,
      authed("/users/me/scouts/s1", "DELETE"),
    );
    expect(response.status).toBe(403);
  });

  it("removes a scout (204)", async () => {
    const { app } = setup();
    const response = await handleRequest(
      app,
      authed("/users/me/scouts/s1", "DELETE"),
    );
    expect(response.status).toBe(204);
  });

  it("maps a missing scout to 404", async () => {
    const { app } = setup({
      remove: () => Promise.reject(new NotFoundError("Scout not found")),
    });
    const response = await handleRequest(
      app,
      authed("/users/me/scouts/s1", "DELETE"),
    );
    expect(response.status).toBe(404);
  });
});
