import { t, type Static } from "elysia";

/** Coarse age band — matches collections/scouts AgeBand (never store DOB). */
export const AgeBandSchema = t.Union([
  t.Literal("10-11"),
  t.Literal("12-13"),
  t.Literal("14-15"),
  t.Literal("16-17"),
]);

const OptionalNullableString = t.Optional(t.Union([t.String(), t.Null()]));

/** Create/update payload for a dependent scout profile. */
export const ScoutRequestSchema = t.Object({
  firstName: t.String({ minLength: 1 }),
  lastName: t.String({ minLength: 1 }),
  unit: OptionalNullableString,
  council: OptionalNullableString,
  district: OptionalNullableString,
  ageBand: t.Optional(t.Union([AgeBandSchema, t.Null()])),
  bsaId: OptionalNullableString,
  accommodations: OptionalNullableString,
});
export type ScoutRequest = Static<typeof ScoutRequestSchema>;

/** Scout profile serialized for the client. */
export const ScoutResponseSchema = t.Object({
  scoutId: t.String(),
  firstName: t.String(),
  lastName: t.String(),
  unit: t.Union([t.String(), t.Null()]),
  council: t.Union([t.String(), t.Null()]),
  district: t.Union([t.String(), t.Null()]),
  ageBand: t.Union([AgeBandSchema, t.Null()]),
  bsaId: t.Union([t.String(), t.Null()]),
  accommodations: t.Union([t.String(), t.Null()]),
});
export type ScoutResponse = Static<typeof ScoutResponseSchema>;

export const ScoutListResponseSchema = t.Object({
  scouts: t.Array(ScoutResponseSchema),
});
export type ScoutListResponse = Static<typeof ScoutListResponseSchema>;
