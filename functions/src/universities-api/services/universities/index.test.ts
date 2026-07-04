import { Timestamp, type Firestore } from "firebase-admin/firestore";
import { describe, expect, it } from "bun:test";
import type { ClassDocument } from "../../../collections/classes.js";
import type { UniversityDocument } from "../../../collections/universities.js";
import { NotFoundError } from "../../../shared-api/errors/http-error.js";
import { UniversitiesServiceImpl } from "./index.js";

const baseUniversity: UniversityDocument = {
  title: "Spring MBU",
  status: "published",
  timezone: "America/New_York",
  startDate: Timestamp.fromDate(new Date("2026-06-01T12:00:00.000Z")),
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: Timestamp.fromDate(
    new Date("2026-05-25T23:59:59.000Z"),
  ),
  location: {
    name: "Scout Hall",
    address: "1 Main St",
    city: "Anytown",
    state: "NY",
    zip: "12345",
  },
  periods: [
    {
      periodId: "p1",
      label: "Morning",
      startsAt: Timestamp.fromDate(new Date("2026-06-01T08:00:00.000Z")),
      endsAt: Timestamp.fromDate(new Date("2026-06-01T12:00:00.000Z")),
    },
  ],
  createdByUid: "u1",
  submittedAt: null,
  publishedAt: null,
  reviewNote: null,
  billing: null,
  createdAt: Timestamp.fromDate(new Date("2026-07-01T00:00:00.000Z")),
  updatedAt: Timestamp.fromDate(new Date("2026-07-01T00:00:00.000Z")),
};

const sampleClass: ClassDocument = {
  badgeSlug: "camping",
  badgeTitle: "Camping",
  eagleRequired: true,
  periodIds: ["p1"],
  capacity: 20,
  enrolledCount: 5,
  waitlistCount: 2,
  room: "Room A",
  notes: "Bring gear",
  counselors: [
    {
      uid: "c1",
      displayName: "Alex Counselor",
      bsaId: "123456789",
      disclaimerAcceptedAt: Timestamp.fromDate(
        new Date("2026-07-01T00:00:00.000Z"),
      ),
      disclaimerVersion: "2026-07-03",
    },
  ],
  createdAt: Timestamp.fromDate(new Date("2026-07-01T00:00:00.000Z")),
  updatedAt: Timestamp.fromDate(new Date("2026-07-01T00:00:00.000Z")),
};

function mockFirestore(options: {
  university: UniversityDocument | null;
  classes?: Array<{ id: string; data: ClassDocument }>;
}): Firestore {
  const universityRef = {
    get: () =>
      Promise.resolve({
        exists: options.university !== null,
        data: () => options.university,
        id: "uni1",
      }),
  };

  const classDocs = options.classes ?? [];
  const classesCollection = {
    orderBy: () => ({
      get: () =>
        Promise.resolve({
          docs: classDocs.map(entry => ({
            id: entry.id,
            data: () => entry.data,
          })),
        }),
    }),
  };

  return {
    collection: (path: string) => {
      if (path === "universities") {
        return { doc: () => universityRef };
      }
      if (path.endsWith("/classes")) {
        return classesCollection;
      }
      throw new Error(`unexpected collection path: ${path}`);
    },
  } as unknown as Firestore;
}

describe("UniversitiesServiceImpl.getPublic", () => {
  it("maps a published university to the public DTO", async () => {
    const service = new UniversitiesServiceImpl(
      mockFirestore({
        university: baseUniversity,
        classes: [{ id: "cls1", data: sampleClass }],
      }),
    );

    const result = await service.getPublic("uni1");

    expect(result.id).toBe("uni1");
    expect(result.title).toBe("Spring MBU");
    expect(result.periods).toHaveLength(1);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0]).toMatchObject({
      classId: "cls1",
      badgeTitle: "Camping",
      capacity: 20,
      enrolledCount: 5,
      seatsRemaining: 15,
      waitlistCount: 2,
      counselors: [{ displayName: "Alex Counselor" }],
    });
    expect(result).not.toHaveProperty("createdByUid");
    expect(result).not.toHaveProperty("status");
    expect(result.classes[0]).not.toHaveProperty("bsaId");
    expect(result.classes[0]?.counselors[0]).not.toHaveProperty("uid");
  });

  const nonPublicStatuses = [
    "draft",
    "submitted",
    "needs_review",
    "rejected",
    "closed",
  ] as const;

  for (const status of nonPublicStatuses) {
    it(`throws NotFoundError for a ${status} university`, async () => {
      const service = new UniversitiesServiceImpl(
        mockFirestore({
          university: { ...baseUniversity, status },
        }),
      );

      await expect(service.getPublic("uni1")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  }

  it("throws NotFoundError for a missing university", async () => {
    const service = new UniversitiesServiceImpl(
      mockFirestore({ university: null }),
    );

    await expect(service.getPublic("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
