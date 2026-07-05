import { Elysia } from "elysia";
import { mapError } from "../../shared-api/errors/on-error.js";
import { purgeRoute } from "../routes/purge.js";
import { PurgeResponseSchema } from "../schemas/retention-schemas.js";
import { RetentionServiceImpl } from "../services/retention/index.js";
import type { PartialRetentionApiServices } from "../types/services.js";
import { requireCronSecret } from "./require-cron-secret.js";

/**
 * Retention plugin — the single cron-triggered purge route, guarded by the
 * shared-secret check (see require-cron-secret). Owns its own `onError` so the
 * guard's thrown `AuthError` maps to 401 whether the plugin is mounted in the
 * app or exercised standalone in tests.
 */
export function createRetentionPlugin(services?: PartialRetentionApiServices) {
  const retention = services?.retentionService ?? RetentionServiceImpl;

  return new Elysia({ name: "retention" })
    .onError(mapError)
    .resolve(requireCronSecret(services?.secretReader))
    .post("/retention/purge", () => purgeRoute(retention), {
      response: PurgeResponseSchema,
    });
}
