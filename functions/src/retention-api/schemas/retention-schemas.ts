import { t, type Static } from "elysia";

export const PurgeResponseSchema = t.Object({
  universitiesProcessed: t.Number(),
  registrationsPurged: t.Number(),
});
export type PurgeResponse = Static<typeof PurgeResponseSchema>;
