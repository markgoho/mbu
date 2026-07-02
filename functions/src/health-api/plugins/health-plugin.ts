import { Elysia } from "elysia";
import { healthService } from "../services/health/index.js";
import { SERVICE_KEYS, type PartialServices } from "../types/services.js";

/**
 * Health API plugin — placeholder for future authenticated routes (#80+).
 */
export function createHealthPlugin(services?: PartialServices) {
  return new Elysia({ name: "health-api" }).decorate(
    SERVICE_KEYS.HEALTH_SERVICE,
    services?.healthService ?? healthService,
  );
}
