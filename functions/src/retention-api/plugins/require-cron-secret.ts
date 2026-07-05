import { AuthError } from "../../shared-api/errors/http-error.js";

/** Reads the configured cron secret. Injected so tests don't need real env vars. */
export type SecretReader = () => string | undefined;

/** Live reader — bound into process.env by the `secrets` list on the retentionApi function. */
export const cronSecretReader: SecretReader = () =>
  process.env["RETENTION_PURGE_SECRET"];

/**
 * Elysia `resolve` handler factory authenticating the GitHub Actions cron
 * caller — there's no Firebase user to sign in as, so this checks a shared
 * secret (`Authorization: Bearer <secret>`) instead of the ID-token check
 * `requireAuth` does for the other APIs. Fails closed: an unconfigured
 * secret rejects every request rather than accepting none.
 */
export function requireCronSecret(
  secretReader: SecretReader = cronSecretReader,
) {
  return ({
    headers,
  }: {
    headers: Record<string, string | undefined>;
  }): void => {
    const expected = secretReader();
    const provided = headers["authorization"];
    if (!expected || provided !== `Bearer ${expected}`) {
      throw new AuthError("Invalid or missing cron secret");
    }
  };
}
