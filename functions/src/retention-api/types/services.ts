import type { SecretReader } from "../plugins/require-cron-secret.js";
import type { RetentionService } from "../services/retention/interface.js";

/**
 * Injectable dependencies for the retention-api app. Tests override any
 * subset; production uses the live defaults wired in app.ts.
 */
export interface RetentionApiServices {
  retentionService: RetentionService;
  /** Cron-secret reader used by the requireCronSecret resolver (fakeable in tests). */
  secretReader: SecretReader;
}

export type PartialRetentionApiServices = Partial<RetentionApiServices>;
