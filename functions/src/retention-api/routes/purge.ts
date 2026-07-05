import type { PurgeResponse } from "../schemas/retention-schemas.js";
import type { RetentionService } from "../services/retention/interface.js";

/**
 * Runs the retention purge. Authentication (the cron shared secret) is enforced
 * by the plugin guard, so this logic function carries no auth code.
 */
export function purgeRoute(
  retentionService: RetentionService,
): Promise<PurgeResponse> {
  return retentionService.purge();
}
