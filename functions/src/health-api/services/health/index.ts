import type { HealthResponse } from "../../schemas/health-schemas.js";
import type { HealthService } from "./interface.js";

export const healthService: HealthService = {
  getStatus(): HealthResponse {
    return { status: "ok" };
  },
};
