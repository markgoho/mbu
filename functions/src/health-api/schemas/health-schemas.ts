import { t, type Static } from "elysia";

export const HealthResponseSchema = t.Object({
  status: t.Literal("ok"),
});

export type HealthResponse = Static<typeof HealthResponseSchema>;
