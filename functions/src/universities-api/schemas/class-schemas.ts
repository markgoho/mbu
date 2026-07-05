import { t, type Static } from "elysia";

export const ClassCounselorResponseSchema = t.Object({
  uid: t.String(),
  displayName: t.String(),
  bsaId: t.String(),
  disclaimerAcceptedAt: t.String(),
  disclaimerVersion: t.String(),
});
export type ClassCounselorResponse = Static<
  typeof ClassCounselorResponseSchema
>;

export const ClassCounselorInputSchema = t.Object({
  bsaId: t.String({ minLength: 1 }),
  acceptDisclaimer: t.Literal(true),
});
export type ClassCounselorInput = Static<typeof ClassCounselorInputSchema>;

export const ClassCreateRequestSchema = t.Object({
  badgeSlug: t.String({ minLength: 1 }),
  periodIds: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
  capacity: t.Integer({ minimum: 1, maximum: 200 }),
  room: t.Optional(t.Union([t.String(), t.Null()])),
  notes: t.Optional(t.Union([t.String(), t.Null()])),
  counselor: ClassCounselorInputSchema,
});
export type ClassCreateRequest = Static<typeof ClassCreateRequestSchema>;

export const ClassPatchRequestSchema = t.Partial(
  t.Object({
    badgeSlug: t.String({ minLength: 1 }),
    periodIds: t.Array(t.String({ minLength: 1 }), { minItems: 1 }),
    capacity: t.Integer({ minimum: 1, maximum: 200 }),
    room: t.Union([t.String(), t.Null()]),
    notes: t.Union([t.String(), t.Null()]),
  }),
);
export type ClassPatchRequest = Static<typeof ClassPatchRequestSchema>;

export const ClassResponseSchema = t.Object({
  classId: t.String(),
  badgeSlug: t.String(),
  badgeTitle: t.String(),
  eagleRequired: t.Boolean(),
  periodIds: t.Array(t.String()),
  capacity: t.Number(),
  enrolledCount: t.Number(),
  waitlistCount: t.Number(),
  room: t.Union([t.String(), t.Null()]),
  notes: t.Union([t.String(), t.Null()]),
  counselors: t.Array(ClassCounselorResponseSchema),
  createdAt: t.String(),
  updatedAt: t.String(),
});
export type ClassResponse = Static<typeof ClassResponseSchema>;

export const BadgeCatalogEntrySchema = t.Object({
  slug: t.String(),
  title: t.String(),
  eagleRequired: t.Boolean(),
});
export type BadgeCatalogEntryResponse = Static<typeof BadgeCatalogEntrySchema>;

export const BadgeCatalogResponseSchema = t.Object({
  badges: t.Array(BadgeCatalogEntrySchema),
});
export type BadgeCatalogResponse = Static<typeof BadgeCatalogResponseSchema>;

export const UniversityDetailResponseSchema = t.Object({
  university: t.Object({
    id: t.String(),
    title: t.String(),
    status: t.String(),
    timezone: t.String(),
    startDate: t.String(),
    endDate: t.Union([t.String(), t.Null()]),
    registrationOpensAt: t.Union([t.String(), t.Null()]),
    registrationClosesAt: t.String(),
    location: t.Object({
      name: t.String(),
      address: t.String(),
      city: t.String(),
      state: t.String(),
      zip: t.String(),
    }),
    periods: t.Array(
      t.Object({
        periodId: t.String(),
        label: t.String(),
        startsAt: t.String(),
        endsAt: t.String(),
      }),
    ),
    createdByUid: t.String(),
    reviewNote: t.Union([t.String(), t.Null()]),
    submittedAt: t.Union([t.String(), t.Null()]),
    createdAt: t.String(),
    updatedAt: t.String(),
  }),
  classes: t.Array(ClassResponseSchema),
});
export type UniversityDetailResponse = Static<
  typeof UniversityDetailResponseSchema
>;
