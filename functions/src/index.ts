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
