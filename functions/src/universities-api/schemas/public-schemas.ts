import { t, type Static } from "elysia";
import { PeriodResponseSchema } from "./period-schemas.js";
import { LocationSchema } from "./university-schemas.js";

export const PublicClassCounselorSchema = t.Object({
  displayName: t.String(),
});
export type PublicClassCounselor = Static<typeof PublicClassCounselorSchema>;

export const PublicClassResponseSchema = t.Object({
  classId: t.String(),
  badgeSlug: t.String(),
  badgeTitle: t.String(),
  eagleRequired: t.Boolean(),
  periodIds: t.Array(t.String()),
  room: t.Union([t.String(), t.Null()]),
  notes: t.Union([t.String(), t.Null()]),
  capacity: t.Number(),
  enrolledCount: t.Number(),
  seatsRemaining: t.Number(),
  waitlistCount: t.Number(),
  counselors: t.Array(PublicClassCounselorSchema),
});
export type PublicClassResponse = Static<typeof PublicClassResponseSchema>;

export const PublicUniversityResponseSchema = t.Object({
  id: t.String(),
  title: t.String(),
  timezone: t.String(),
  startDate: t.String(),
  endDate: t.Union([t.String(), t.Null()]),
  registrationOpensAt: t.Union([t.String(), t.Null()]),
  registrationClosesAt: t.String(),
  location: LocationSchema,
  periods: t.Array(PeriodResponseSchema),
  classes: t.Array(PublicClassResponseSchema),
});
export type PublicUniversityResponse = Static<
  typeof PublicUniversityResponseSchema
>;
