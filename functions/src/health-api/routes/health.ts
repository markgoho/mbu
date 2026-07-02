import type { HealthService } from "../services/health/interface.js";

export function healthRoute(healthService: HealthService) {
  return healthService.getStatus();
}
