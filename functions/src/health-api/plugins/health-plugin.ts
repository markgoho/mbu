import { Elysia } from "elysia";
import { healthRoute } from "../routes/health.js";
import { HealthResponseSchema } from "../schemas/health-schemas.js";
import { healthService } from "../services/health/index.js";
import type { HealthService } from "../services/health/interface.js";

export interface HealthApiServices {
  healthService: HealthService;
}

export type PartialHealthApiServices = Partial<HealthApiServices>;

/**
 * Health routes. Dependencies are resolved once here and passed explicitly to
 * route logic through closures.
 */
export function createHealthPlugin(services?: PartialHealthApiServices) {
  const resolvedHealthService = services?.healthService ?? healthService;

  return new Elysia({ name: "health-api" }).get(
    "/health",
    () => healthRoute(resolvedHealthService),
    { response: HealthResponseSchema },
  );
}
