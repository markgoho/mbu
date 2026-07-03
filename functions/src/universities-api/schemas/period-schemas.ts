import { t, type Static } from "elysia";

export const PeriodInputSchema = t.Object({
  periodId: t.Optional(t.String({ minLength: 1 })),
  label: t.String({ minLength: 1 }),
  startsAt: t.String({ format: "date-time" }),
  endsAt: t.String({ format: "date-time" }),
});
export type PeriodInput = Static<typeof PeriodInputSchema>;

export const PeriodsPutRequestSchema = t.Object({
  periods: t.Array(PeriodInputSchema),
});
export type PeriodsPutRequest = Static<typeof PeriodsPutRequestSchema>;

export const PeriodResponseSchema = t.Object({
  periodId: t.String(),
  label: t.String(),
  startsAt: t.String(),
  endsAt: t.String(),
});
export type PeriodResponse = Static<typeof PeriodResponseSchema>;

export const PeriodsResponseSchema = t.Object({
  periods: t.Array(PeriodResponseSchema),
});
export type PeriodsResponse = Static<typeof PeriodsResponseSchema>;

/** Structured 409 payload when removing periods still referenced by classes. */
export const PeriodConflictDetailsSchema = t.Object({
  classes: t.Array(
    t.Object({
      classId: t.String(),
      title: t.String(),
    }),
  ),
});
export type PeriodConflictDetails = Static<typeof PeriodConflictDetailsSchema>;
