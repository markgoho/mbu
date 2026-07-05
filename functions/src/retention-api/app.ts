import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import { requireCronSecret } from "./plugins/require-cron-secret.js";
import { PurgeResponseSchema } from "./schemas/retention-schemas.js";
import { retentionService as defaultRetention } from "./services/retention/index.js";
import type { PartialRetentionApiServices } from "./types/services.js";

/**
 * Create the retention-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/retention/** → retentionApi function. Called
 * only by the daily GitHub Actions cron job (see
 * .github/workflows/retention-purge-cron.yml) — authenticated by a shared
 * secret (requireCronSecret), not a Firebase ID token, since the caller
 * isn't a signed-in user.
 */
export function createApp(services?: PartialRetentionApiServices) {
  const retention = services?.retentionService ?? defaultRetention;

  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .resolve(requireCronSecret(services?.secretReader))
    .post("/retention/purge", () => retention.purge(), {
      response: PurgeResponseSchema,
    });
}

export const app = createApp();
