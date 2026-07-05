import { mock } from "bun:test";
import type { SecretReader } from "../plugins/require-cron-secret.js";
import { createRetentionPlugin } from "../plugins/retention-plugin.js";
import type { RetentionService } from "../services/retention/interface.js";

/** The cron secret the test plugin is configured to expect by default. */
export const RETENTION_TEST_SECRET = "test-cron-secret";

/**
 * Builds the retention plugin with a default mock retention service and a
 * cron-secret reader configured to `RETENTION_TEST_SECRET`. Tests send
 * `Authorization: Bearer <RETENTION_TEST_SECRET>` for the happy path and
 * omit/alter it (or override `secretReader`) for the failure cases.
 * Self-contained — no shared fixtures.
 */
export function createRetentionTestPlugin(overrides?: {
  retentionService?: Partial<RetentionService>;
  secretReader?: SecretReader;
}) {
  const retentionService: RetentionService = {
    purge: mock(() =>
      Promise.resolve({ universitiesProcessed: 0, registrationsPurged: 0 }),
    ),
    ...overrides?.retentionService,
  };

  const secretReader: SecretReader =
    overrides?.secretReader ?? (() => RETENTION_TEST_SECRET);

  return createRetentionPlugin({ retentionService, secretReader });
}
