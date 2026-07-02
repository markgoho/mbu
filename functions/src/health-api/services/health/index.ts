import type { HealthResponse } from "../../schemas/health-schemas.js";
import type { HealthService } from "./interface.js";

export class HealthServiceImpl implements HealthService {
  getStatus(): HealthResponse {
    return { status: "ok" };
  }
}

export const healthService = new HealthServiceImpl();
