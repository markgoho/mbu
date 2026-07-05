import { describe, expect, it } from "bun:test";
import { ERROR_CODES } from "../../shared-api/errors/http-error.js";
import { handleRequest } from "../../test-utils/handle-request.js";
import type {
  RegistrationResponse,
  ScheduleResponse,
} from "../schemas/registration-schemas.js";
import type { RegistrationsService } from "../services/registrations/interface.js";
import {
  createRegistrationsTestPlugin,
  tokenVerifiers,
} from "../test-utils/create-registrations-test-plugin.js";

const enrolled: RegistrationResponse = {
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

interface SetupOptions {
  authToken?: string | null;
  unverified?: boolean;
  listSchedule?: RegistrationsService["listSchedule"];
}

function setup({
  authToken = "Bearer x",
  unverified = false,
  listSchedule,
}: SetupOptions = {}) {
  const plugin = createRegistrationsTestPlugin({
    ...(unverified && { verifyToken: tokenVerifiers.unverified }),
    ...(listSchedule && { registrationsService: { listSchedule } }),
  });

  const headers: Record<string, string> = {};
  if (authToken) headers["authorization"] = authToken;

  const request = new Request("http://localhost/registrations/uni1", {
    method: "GET",
    headers,
  });

  return { plugin, request };
}

describe("GET /api/registrations/:universityId", () => {
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

  it("returns an empty schedule", async () => {
    const { plugin, request } = setup();
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(200);
    const responseBody = (await response.json()) as {
      registrations: unknown[];
    };
    expect(responseBody.registrations).toEqual([]);
  });

  it("returns the parent's active registrations across scouts", async () => {
    const schedule: ScheduleResponse = { registrations: [enrolled] };
    const { plugin, request } = setup({
      listSchedule: () => Promise.resolve(schedule),
    });
    const response = await handleRequest(plugin, request);
    expect(response.status).toBe(200);
    const responseBody = (await response.json()) as ScheduleResponse;
    expect(responseBody.registrations).toEqual([enrolled]);
  });
});
