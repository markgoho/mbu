import { t, type Static } from "elysia";

export const LocationSchema = t.Object({
  name: t.String({ minLength: 1 }),
  address: t.String({ minLength: 1 }),
  city: t.String({ minLength: 1 }),
  state: t.String({ minLength: 1 }),
  zip: t.String({ minLength: 1 }),
});
export type LocationInput = Static<typeof LocationSchema>;

/**
 * Client-minted Firestore doc id, sent on create so the chancellor grant
 * resolves in the same txn. Constrained to a UUID (the client mints it with
 * crypto.randomUUID()) so a malformed id can't reach `.doc()` and 500.
 */
export const UniversityCreateRequestSchema = t.Object({
  id: t.String({
    pattern:
      "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
  }),
  title: t.String({ minLength: 1, maxLength: 120 }),
  timezone: t.String({ minLength: 1 }),
  startDate: t.String({ format: "date-time" }),
  endDate: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
  registrationOpensAt: t.Optional(
    t.Union([t.String({ format: "date-time" }), t.Null()]),
  ),
  registrationClosesAt: t.String({ format: "date-time" }),
  location: LocationSchema,
});
export type UniversityCreateRequest = Static<
  typeof UniversityCreateRequestSchema
>;

export const UniversityPatchRequestSchema = t.Partial(
  t.Object({
    title: t.String({ minLength: 1, maxLength: 120 }),
    timezone: t.String({ minLength: 1 }),
    startDate: t.String({ format: "date-time" }),
    endDate: t.Union([t.String({ format: "date-time" }), t.Null()]),
    registrationOpensAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
    registrationClosesAt: t.String({ format: "date-time" }),
    location: LocationSchema,
  }),
);
export type UniversityPatchRequest = Static<
  typeof UniversityPatchRequestSchema
>;

export const UniversityResponseSchema = t.Object({
  id: t.String(),
  title: t.String(),
  status: t.Union([
    t.Literal("draft"),
    t.Literal("submitted"),
    t.Literal("needs_review"),
    t.Literal("published"),
    t.Literal("closed"),
    t.Literal("rejected"),
  ]),
  timezone: t.String(),
  startDate: t.String(),
  endDate: t.Union([t.String(), t.Null()]),
  registrationOpensAt: t.Union([t.String(), t.Null()]),
  registrationClosesAt: t.String(),
  location: LocationSchema,
  createdByUid: t.String(),
  reviewNote: t.Union([t.String(), t.Null()]),
  submittedAt: t.Union([t.String(), t.Null()]),
  createdAt: t.String(),
  updatedAt: t.String(),
});
export type UniversityResponse = Static<typeof UniversityResponseSchema>;

export const UniversitySummaryResponseSchema = t.Object({
  id: t.String(),
  title: t.String(),
  status: t.String(),
  startDate: t.String(),
  endDate: t.Union([t.String(), t.Null()]),
  classCount: t.Number(),
});
export type UniversitySummaryResponse = Static<
  typeof UniversitySummaryResponseSchema
>;

export const UniversityListResponseSchema = t.Object({
  universities: t.Array(UniversitySummaryResponseSchema),
});
export type UniversityListResponse = Static<
  typeof UniversityListResponseSchema
>;

export const RejectRequestSchema = t.Object({
  note: t.String({ minLength: 1, maxLength: 2000 }),
});
export type RejectRequest = Static<typeof RejectRequestSchema>;

export const ReviewQueueRowSchema = t.Object({
  id: t.String(),
  title: t.String(),
  chancellorName: t.String(),
  chancellorEmail: t.String(),
  submittedAt: t.Union([t.String(), t.Null()]),
  classCount: t.Number(),
  startDate: t.String(),
});
export type ReviewQueueRow = Static<typeof ReviewQueueRowSchema>;

export const ReviewQueueResponseSchema = t.Object({
  universities: t.Array(ReviewQueueRowSchema),
});
export type ReviewQueueResponse = Static<typeof ReviewQueueResponseSchema>;
