import type { Request } from "firebase-functions/v2/https";
import { ERROR_IDS } from "../../constants/error-ids.js";
import { sendWebResponse, toWebRequest } from "../adapters.js";
import type { FirebaseResponse } from "../types/firebase-response.js";
import type { Logger } from "../types/logger.js";

interface ElysiaApp {
  handle(request: globalThis.Request): Promise<globalThis.Response>;
}

interface HandleElysiaRequestOptions {
  app: ElysiaApp;
  request: Request;
  response: FirebaseResponse;
  logger: Logger;
  apiName: string;
}

/**
 * Shared handler logic for Elysia-based Firebase Functions.
 */
export async function handleElysiaRequest({
  app,
  request,
  response,
  logger,
  apiName,
}: HandleElysiaRequestOptions): Promise<void> {
  try {
    const webResponse = await app.handle(toWebRequest(request));
    await sendWebResponse(webResponse, response);
  } catch (error) {
    const errorDetails = {
      errorId: ERROR_IDS.API_HANDLER_FAILED,
      path: request.url,
      method: request.method,
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      errorStack: error instanceof Error ? error.stack : undefined,
    };

    logger.error(`Elysia ${apiName} handler failed`, errorDetails);

    if (response.headersSent) {
      logger.warn("Cannot send error response - headers already sent", {
        errorId: ERROR_IDS.API_HEADERS_ALREADY_SENT,
        path: request.url,
        method: request.method,
      });
    } else {
      response.status(500).json({
        error: "Internal server error",
        message:
          "An unexpected error occurred while processing your request. Please try again later.",
      });
    }
  }
}
