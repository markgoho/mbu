import { mock } from "bun:test";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  AuthError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared-api/errors/http-error.js";
import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import { createApp } from "../app.js";
import type { ClassesService } from "../services/classes/interface.js";
import type { PeriodsService } from "../services/periods/interface.js";
import type { UniversitiesService } from "../services/universities/interface.js";

/**
 * Self-contained token-verifier mocks. Each rejects a missing Authorization
 * header (→ 401), so the "no token" case is exercised by simply omitting the
 * header. `unverified` yields an unverified email (→ 403 EMAIL_NOT_VERIFIED);
 * `superAdmin` yields a super-admin caller.
 */
export const verified: TokenVerifier = header =>
  header
    ? Promise.resolve({
        uid: "u1",
        email: "u1@example.com",
        email_verified: true,
      } as DecodedIdToken)
    : Promise.reject(new AuthError("Missing Authorization header"));

export const unverified: TokenVerifier = header =>
  header
    ? Promise.resolve({
        uid: "u1",
        email: "u1@example.com",
        email_verified: false,
      } as DecodedIdToken)
    : Promise.reject(new AuthError("Missing Authorization header"));

export const superAdmin: TokenVerifier = header =>
  header
    ? Promise.resolve({
        uid: "admin1",
        email: "admin1@example.com",
        email_verified: true,
        superAdmin: true,
      } as unknown as DecodedIdToken)
    : Promise.reject(new AuthError("Missing Authorization header"));

const location = {
  name: "Scout Hall",
  address: "1 Main St",
  city: "Anytown",
  state: "NY",
  zip: "12345",
};

const sampleUniversity = {
  id: "uni1",
  title: "Spring MBU",
  status: "draft" as const,
  timezone: "America/New_York",
  startDate: "2026-06-01T12:00:00.000Z",
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: "2026-05-25T23:59:59.000Z",
  location,
  createdByUid: "u1",
  reviewNote: null,
  submittedAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const sampleClass = {
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
};

const samplePublicUniversity = {
  id: "uni1",
  title: "Spring MBU",
  timezone: "America/New_York",
  startDate: "2026-06-01T12:00:00.000Z",
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: "2026-05-25T23:59:59.000Z",
  location,
  periods: [
    {
      periodId: "p1",
      label: "Morning",
      startsAt: "2026-06-01T08:00:00.000Z",
      endsAt: "2026-06-01T12:00:00.000Z",
    },
  ],
  classes: [
    {
      classId: "cls1",
      badgeSlug: "camping",
      badgeTitle: "Camping",
      eagleRequired: true,
      periodIds: ["p1"],
      room: "Room A",
      notes: null,
      capacity: 20,
      enrolledCount: 5,
      seatsRemaining: 15,
      waitlistCount: 0,
      counselors: [{ displayName: "Alex Counselor" }],
    },
  ],
};

/**
 * Default mock universities service. Scenario ids drive failure paths:
 * `missing-uni`/`draft-uni` → 404, `forbidden-uni` → 403, `no-classes-uni`
 * → 400 (submit), `illegal-uni` → 409 (any transition). Admin methods reject a
 * non-super-admin caller with 403.
 */
function defaultUniversitiesService(): UniversitiesService {
  return {
    getPublic: mock(universityId =>
      universityId === "draft-uni" || universityId === "missing-uni"
        ? Promise.reject(new NotFoundError("University not found"))
        : Promise.resolve({ ...samplePublicUniversity, id: universityId }),
    ),
    create: mock((_caller, request) =>
      Promise.resolve({
        ...sampleUniversity,
        id: request.id,
        title: request.title,
      }),
    ),
    patch: mock((_caller, universityId, request) =>
      Promise.resolve({
        ...sampleUniversity,
        id: universityId,
        title: request.title ?? sampleUniversity.title,
      }),
    ),
    listMine: mock(() =>
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
    ),
    getDetail: mock((_caller, universityId) =>
      universityId === "forbidden-uni"
        ? Promise.reject(
            new ForbiddenError("Not chancellor of this university"),
          )
        : Promise.resolve({
            university: { ...sampleUniversity, id: universityId, periods: [] },
            classes: [],
          }),
    ),
    remove: mock(() => Promise.resolve()),
    submit: mock((_caller, universityId) => {
      if (universityId === "no-classes-uni") {
        return Promise.reject(
          new ValidationError(
            "At least one class is required to submit for review",
          ),
        );
      }
      if (universityId === "illegal-uni") {
        return Promise.reject(
          new ConflictError("Cannot transition from published to submitted"),
        );
      }
      return Promise.resolve({
        ...sampleUniversity,
        id: universityId,
        status: "submitted" as const,
        submittedAt: "2026-07-04T00:00:00.000Z",
      });
    }),
    close: mock((_caller, universityId) =>
      universityId === "illegal-uni"
        ? Promise.reject(
            new ConflictError("Cannot transition from draft to closed"),
          )
        : Promise.resolve({
            ...sampleUniversity,
            id: universityId,
            status: "closed" as const,
          }),
    ),
    approve: mock((caller, universityId) => {
      if (!caller.superAdmin) {
        return Promise.reject(
          new ForbiddenError("Super-admin privileges required"),
        );
      }
      if (universityId === "illegal-uni") {
        return Promise.reject(
          new ConflictError("Cannot transition from draft to published"),
        );
      }
      return Promise.resolve({
        ...sampleUniversity,
        id: universityId,
        status: "published" as const,
      });
    }),
    reject: mock((caller, universityId, note) => {
      if (!caller.superAdmin) {
        return Promise.reject(
          new ForbiddenError("Super-admin privileges required"),
        );
      }
      if (universityId === "illegal-uni") {
        return Promise.reject(
          new ConflictError("Cannot transition from draft to rejected"),
        );
      }
      return Promise.resolve({
        ...sampleUniversity,
        id: universityId,
        status: "rejected" as const,
        reviewNote: note,
      });
    }),
    listReviewQueue: mock(caller =>
      caller.superAdmin
        ? Promise.resolve({
            universities: [
              {
                id: "uni1",
                title: "Spring MBU",
                chancellorName: "Alex Chancellor",
                chancellorEmail: "alex@example.com",
                submittedAt: "2026-07-01T00:00:00.000Z",
                classCount: 2,
                startDate: sampleUniversity.startDate,
              },
            ],
          })
        : Promise.reject(new ForbiddenError("Super-admin privileges required")),
    ),
  };
}

function defaultPeriodsService(): PeriodsService {
  return {
    put: mock(() =>
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
    ),
  };
}

function defaultClassesService(): ClassesService {
  return {
    create: mock(() => Promise.resolve({ ...sampleClass })),
    patch: mock((_caller, _universityId, classId) =>
      Promise.resolve({ ...sampleClass, classId, capacity: 25 }),
    ),
    remove: mock(() => Promise.resolve()),
    listBadges: mock(() =>
      Promise.resolve({
        badges: [{ slug: "camping", title: "Camping", eagleRequired: true }],
      }),
    ),
  };
}

/**
 * Builds the full universities-api app (both plugins + `mapError`) wired with
 * default mock services and the `verified` token verifier. Override any subset
 * of service methods or the verifier per test.
 */
export function createUniversitiesTestPlugin(overrides?: {
  universitiesService?: Partial<UniversitiesService>;
  periodsService?: Partial<PeriodsService>;
  classesService?: Partial<ClassesService>;
  verifyToken?: TokenVerifier;
}) {
  return createApp({
    universitiesService: {
      ...defaultUniversitiesService(),
      ...overrides?.universitiesService,
    },
    periodsService: {
      ...defaultPeriodsService(),
      ...overrides?.periodsService,
    },
    classesService: {
      ...defaultClassesService(),
      ...overrides?.classesService,
    },
    verifyToken: overrides?.verifyToken ?? verified,
  });
}
