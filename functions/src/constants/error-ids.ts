/**
 * Error ID constants for Sentry tracking and error correlation.
 */
export const ERROR_IDS = {
  API_HANDLER_FAILED: "api_handler_failed",
  API_ADAPTER_CONVERSION_FAILED: "api_adapter_conversion_failed",
  API_ADAPTER_MISSING_HOST: "api_adapter_missing_host",
  API_ADAPTER_RESPONSE_FAILED: "api_adapter_response_failed",
  API_HEADERS_ALREADY_SENT: "api_headers_already_sent",
} as const;

export type ErrorId = (typeof ERROR_IDS)[keyof typeof ERROR_IDS];
