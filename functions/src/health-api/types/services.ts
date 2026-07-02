import type { HealthService } from "../services/health/interface.js";
import type { Logger } from "../../shared-api/types/logger.js";

export const SERVICE_KEYS = {
  HEALTH_SERVICE: "healthService",
  LOGGER: "logger",
} as const;

export interface Services {
  [SERVICE_KEYS.HEALTH_SERVICE]: HealthService;
  [SERVICE_KEYS.LOGGER]: Logger;
}

export type PartialServices = Partial<Services>;
