import { describe, expect, it } from "bun:test";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  ForbiddenError,
  ValidationError,
} from "../shared-api/errors/http-error.js";
import type { TokenVerifier } from "../shared-api/plugins/require-auth.js";
import { handleRequest } from "../test-utils/handle-request.js";
import { createApp } from "./app.js";
import type { ClassesService } from "./services/classes/interface.js";
import type { PeriodsService } from "./services/periods/interface.js";
import type { UniversitiesService } from "./services/universities/interface.js";

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

const sampleUniversity = {
  id: "uni1",
  title: "Spring MBU",
  status: "draft" as const,
  timezone: "America/New_York",
  startDate: "2026-06-01T12:00:00.000Z",
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: "2026-05-25T23:59:59.000Z",
  location: {
    name: "Scout Hall",
    address: "1 Main St",
    city: "Anytown",
    state: "NY",
    zip: "12345",
  },
  createdByUid: "u1",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const universitiesService: UniversitiesService = {
  create: (_caller, request) =>
    Promise.resolve({
      ...sampleUniversity,
      id: request.id,
      title: request.title,
    }),
  patch: (_caller, universityId, request) =>
    Promise.resolve({
      ...sampleUniversity,
      id: universityId,
      title: request.title ?? sampleUniversity.title,
    }),
  listMine: () =>
    Promise.resolve({
      universities: [
        {
          id: "uni1",
          title: "Spring MBU",
          status: "draft",
          startDate: sampleUniversity.startDate,
          endDate: null,
          classCount: 0,
        },
      ],
    }),
  getDetail: (_caller, universityId) =>
    Promise.resolve({
      university: {
        ...sampleUniversity,
        id: universityId,
        periods: [],
      },
      classes: [],
    }),
  remove: () => Promise.resolve(),
};

const periodsService: PeriodsService = {
  put: () =>
    Promise.resolve({
      periods: [
        {
          periodId: "p1",
          label: "Morning",
          startsAt: "2026-06-01T08:00:00.000Z",
          endsAt: "2026-06-01T12:00:00.000Z",
        },
      ],
    }),
};

const classesService: ClassesService = {
  create: () =>
    Promise.resolve({
      classId: "cls1",
      badgeSlug: "camping",
      badgeTitle: "Camping",
      eagleRequired: true,
      periodIds: ["p1"],
      capacity: 20,
      enrolledCount: 0,
      waitlistCount: 0,
      room: null,
      notes: null,
      counselors: [],
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    }),
  patch: (_caller, _universityId, classId) =>
    Promise.resolve({
      classId,
      badgeSlug: "camping",
      badgeTitle: "Camping",
      eagleRequired: true,
      periodIds: ["p1"],
      capacity: 25,
      enrolledCount: 0,
      waitlistCount: 0,
      room: null,
      notes: null,
      counselors: [],
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-02T00:00:00.000Z",
    }),
  remove: () => Promise.resolve(),
  listBadges: () =>
    Promise.resolve({
      badges: [{ slug: "camping", title: "Camping", eagleRequired: true }],
    }),
};

function authed(path: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { authorization: "Bearer x", "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("universities-api auth gate", () => {
  it("rejects a request with no Authorization header (401)", async () => {
    const app = createApp({
      universitiesService,
      periodsService,
      classesService,
    });
    const response = await handleRequest(
      app,
      new Request("http://localhost/api/universities/mine", { method: "GET" }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects an unverified email with 403 EMAIL_NOT_VERIFIED", async () => {
    const app = createApp({
      universitiesService,
      periodsService,
      classesService,
      verifyToken: unverified,
    });
    const response = await handleRequest(
      app,
      authed("/api/universities/mine", "GET"),
    );
    expect(response.status).toBe(403);
    const body = (await response.json()) as { code?: string };
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
  });
});

describe("universities-api routes", () => {
  const app = () =>
    createApp({
      universitiesService,
      periodsService,
      classesService,
      verifyToken: verified,
    });

  it("POST /api/universities creates a university", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/universities", "POST", {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Spring MBU",
        timezone: "America/New_York",
        startDate: "2026-06-01T12:00:00.000Z",
        registrationClosesAt: "2026-05-25T23:59:59.000Z",
        location: sampleUniversity.location,
      }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; status: string };
    expect(body.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(body.status).toBe("draft");
  });

  it("GET /api/universities/mine lists chancellor universities", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/universities/mine", "GET"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { universities: unknown[] };
    expect(body.universities).toHaveLength(1);
  });

  it("GET /api/universities/badges returns the catalog", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/universities/badges", "GET"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { badges: { slug: string }[] };
    expect(body.badges[0]?.slug).toBe("camping");
  });

  it("GET /api/universities/:id returns detail", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/universities/uni1", "GET"),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { university: { id: string } };
    expect(body.university.id).toBe("uni1");
  });

  it("DELETE /api/universities/:id returns 204", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/universities/uni1", "DELETE"),
    );
    expect(response.status).toBe(204);
  });

  it("DELETE /api/universities/:id/classes/:classId returns 204", async () => {
    const response = await handleRequest(
      app(),
      authed("/api/universities/uni1/classes/cls1", "DELETE"),
    );
    expect(response.status).toBe(204);
  });
});

describe("universities-api 403 path", () => {
  it("propagates ForbiddenError from getDetail", async () => {
    const forbidden: UniversitiesService = {
      ...universitiesService,
      getDetail: () => Promise.reject(new ForbiddenError("not chancellor")),
    };
    const app = createApp({
      universitiesService: forbidden,
      periodsService,
      classesService,
      verifyToken: verified,
    });
    const response = await handleRequest(
      app,
      authed("/api/universities/uni1", "GET"),
    );
    expect(response.status).toBe(403);
  });
});

describe("validation service unit tests", () => {
  it("validateTimezone rejects invalid zones", async () => {
    const { validateTimezone } = await import("./services/validation.js");
    expect(() => validateTimezone("Not/A/Timezone")).toThrow(ValidationError);
  });
});
