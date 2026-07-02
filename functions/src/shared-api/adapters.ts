import { logger } from "firebase-functions/v2";
import type { Request } from "firebase-functions/v2/https";
import { ERROR_IDS } from "../constants/error-ids.js";
import type { FirebaseResponse } from "./types/firebase-response.js";

/**
 * Convert Firebase Functions request to Web Request.
 */
export function toWebRequest(request: Request): globalThis.Request {
  try {
    const host = request.headers.host;
    if (!host) {
      logger.warn("Missing host header in request", {
        errorId: ERROR_IDS.API_ADAPTER_MISSING_HOST,
        url: request.url,
        method: request.method,
      });
    }
    const actualHost = host ?? "localhost";
    const url = new URL(request.url, `https://${actualHost}`);
    const headers = normalizeHeaders(request.headers);
    const body = getRequestBody(request);

    return new globalThis.Request(url.href, {
      method: request.method,
      headers,
      body,
    });
  } catch (error) {
    logger.error("Failed to convert Firebase request to Web request", {
      errorId: ERROR_IDS.API_ADAPTER_CONVERSION_FAILED,
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      requestMethod: request.method,
      requestUrl: request.url,
    });
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to convert Firebase request to Web request: ${errorMessage}`,
      { cause: error },
    );
  }
}

function normalizeHeaders(requestHeaders: Request["headers"]): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (typeof value === "string") {
      headers.append(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        headers.append(key, v);
      }
    }
  }

  return headers;
}

function getRequestBody(request: Request): Buffer | undefined {
  const methodsWithoutBody = ["GET", "HEAD"];

  if (methodsWithoutBody.includes(request.method)) {
    return undefined;
  }

  return (request as Request & { rawBody?: Buffer }).rawBody;
}

/**
 * Send Web Response to Firebase response object.
 */
export async function sendWebResponse(
  webResponse: globalThis.Response,
  response: FirebaseResponse,
): Promise<void> {
  try {
    response.status(webResponse.status);

    for (const [key, value] of webResponse.headers) {
      response.setHeader(key, value);
    }

    const responseBody = await getResponseBody(webResponse);
    response.send(responseBody);
  } catch (error) {
    logger.error("Failed to send Web response to Firebase", {
      errorId: ERROR_IDS.API_ADAPTER_RESPONSE_FAILED,
      error,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      responseStatus: webResponse.status,
    });
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(
      `Failed to send Web response to Firebase: ${errorMessage}`,
      { cause: error },
    );
  }
}

async function getResponseBody(
  webResponse: globalThis.Response,
): Promise<string | Buffer> {
  const contentType = webResponse.headers.get("content-type") ?? "text/plain";

  const textContentTypes = [
    "application/json",
    "text/",
    "application/xml",
    "application/x-www-form-urlencoded",
  ];

  const isTextContent = textContentTypes.some(type =>
    contentType.includes(type),
  );

  if (isTextContent) {
    return webResponse.text();
  }

  const arrayBuffer = await webResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
