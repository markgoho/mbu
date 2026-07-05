import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { logger as firebaseLogger } from "firebase-functions/v2";
import { createHealthPlugin } from "./plugins/health-plugin.js";
import { healthRoute } from "./routes/health.js";
import { HealthResponseSchema } from "./schemas/health-schemas.js";
import { healthService } from "./services/health/index.js";
import { SERVICE_KEYS, type PartialServices } from "./types/services.js";

/**
 * Create health-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/health → healthApi function.
 */
export function createApp(services?: PartialServices) {
  const resolvedHealthService = services?.healthService ?? healthService;

  return new Elysia({ adapter: node(), prefix: "/api" })
    .decorate(SERVICE_KEYS.LOGGER, services?.logger ?? firebaseLogger)
    .decorate(SERVICE_KEYS.HEALTH_SERVICE, resolvedHealthService)
    .get("/health", ({ healthService: service }) => healthRoute(service), {
      response: HealthResponseSchema,
    })
    .use(createHealthPlugin(services));
}

export const app = createApp();
