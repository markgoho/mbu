import { t, type Static } from "elysia";

export const RegisterRequestSchema = t.Object({
  scoutId: t.String({ minLength: 1 }),
  acceptWaitlist: t.Optional(t.Boolean()),
});
export type RegisterRequest = Static<typeof RegisterRequestSchema>;

export const RegistrationResponseSchema = t.Object({
  scoutId: t.String(),
  classId: t.String(),
  universityId: t.String(),
  status: t.Union([t.Literal("enrolled"), t.Literal("waitlisted")]),
  periodIds: t.Array(t.String()),
  badgeSlug: t.String(),
  badgeTitle: t.String(),
  waitlistedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
  enrolledAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
});
export type RegistrationResponse = Static<typeof RegistrationResponseSchema>;

export const ScheduleResponseSchema = t.Object({
  registrations: t.Array(RegistrationResponseSchema),
});
export type ScheduleResponse = Static<typeof ScheduleResponseSchema>;
