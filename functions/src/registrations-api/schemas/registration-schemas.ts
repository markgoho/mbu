import { t, type Static } from "elysia";

export const RegisterRequestSchema = t.Object({
  scoutId: t.String({ minLength: 1 }),
  acceptWaitlist: t.Optional(t.Boolean()),
  acceptConsent: t.Boolean(),
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

export const RosterRowSchema = t.Object({
  scoutId: t.String(),
  scoutFirstName: t.String(),
  scoutLastName: t.String(),
  scoutUnit: t.Union([t.String(), t.Null()]),
  accommodations: t.Union([t.String(), t.Null()]),
  parentName: t.String(),
  parentEmail: t.String(),
  consentReceived: t.Boolean(),
  status: t.Union([t.Literal("enrolled"), t.Literal("waitlisted")]),
});
export type RosterRow = Static<typeof RosterRowSchema>;

export const ClassRosterSchema = t.Object({
  class: t.Object({
    classId: t.String(),
    badgeTitle: t.String(),
    periodLabels: t.Array(t.String()),
    room: t.Union([t.String(), t.Null()]),
    capacity: t.Number(),
    enrolledCount: t.Number(),
    waitlistCount: t.Number(),
    counselorNames: t.Array(t.String()),
  }),
  enrolled: t.Array(RosterRowSchema),
  waitlisted: t.Array(RosterRowSchema),
});
export type ClassRoster = Static<typeof ClassRosterSchema>;

export const RosterResponseSchema = t.Object({
  university: t.Object({
    title: t.String(),
    startDate: t.String({ format: "date-time" }),
    endDate: t.Union([t.String({ format: "date-time" }), t.Null()]),
    location: t.Object({
      name: t.String(),
      address: t.String(),
      city: t.String(),
      state: t.String(),
      zip: t.String(),
    }),
    timezone: t.String(),
  }),
  classRosters: t.Array(ClassRosterSchema),
});
export type RosterResponse = Static<typeof RosterResponseSchema>;
