import { getApps, initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";

if (getApps().length === 0) {
  initializeApp();
}

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
  },
  async (request, response) => {
    const { handleRegistrationsApi } =
      await import("./registrations-api/handler.js");
    await handleRegistrationsApi(request, response);
  },
);
