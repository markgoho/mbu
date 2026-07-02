import type { HealthResponse } from "../../schemas/health-schemas.js";

export interface HealthService {
  getStatus(): HealthResponse;
}
