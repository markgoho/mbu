import type { PurgeResponse } from "../../schemas/retention-schemas.js";

export interface RetentionService {
  /**
   * Nulls the PII snapshot on every not-yet-purged registration belonging to
   * a university whose effective end (`endDate ?? startDate`) is 90+ days in
   * the past. Idempotent — safe to run daily.
   */
  purge(): Promise<PurgeResponse>;
}
