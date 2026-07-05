import { getApps, initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

const MAILGUN_API_KEY = defineSecret("MAILGUN_API_KEY");
const RETENTION_PURGE_SECRET = defineSecret("RETENTION_PURGE_SECRET");

export const healthApi = onRequest(
  {
    invoker: "public",
    region: "us-east4",
  },
  async (request, response) => {
    const { handleHealthApi } = await import("./health-api/handler.js");
    await handleHealthApi(request, response);
  },
);

export const usersApi = onRequest(
  {
    invoker: "public",
    region: "us-east4",
  },
  async (request, response) => {
    const { handleUsersApi } = await import("./users-api/handler.js");
    await handleUsersApi(request, response);
  },
);

export const universitiesApi = onRequest(
  {
    invoker: "public",
    region: "us-east4",
  },
  async (request, response) => {
    const { handleUniversitiesApi } =
      await import("./universities-api/handler.js");
    await handleUniversitiesApi(request, response);
  },
);

export const registrationsApi = onRequest(
  {
    invoker: "public",
    region: "us-east4",
    secrets: [MAILGUN_API_KEY],
  },
  async (request, response) => {
    const { handleRegistrationsApi } =
      await import("./registrations-api/handler.js");
    await handleRegistrationsApi(request, response);
  },
);

// Invoker is "public" (network-reachable by anyone) like the other APIs, but
// the only real caller is the daily GitHub Actions cron job — app-level auth
// is the shared secret checked by requireCronSecret, not a Firebase ID token.
export const retentionApi = onRequest(
  {
    invoker: "public",
    region: "us-east4",
    secrets: [RETENTION_PURGE_SECRET],
  },
  async (request, response) => {
    const { handleRetentionApi } = await import("./retention-api/handler.js");
    await handleRetentionApi(request, response);
  },
);
