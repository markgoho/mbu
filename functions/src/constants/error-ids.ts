/**
 * Error ID constants for Sentry tracking and error correlation.
 */
export const ERROR_IDS = {
  API_HANDLER_FAILED: "api_handler_failed",
  API_ADAPTER_CONVERSION_FAILED: "api_adapter_conversion_failed",
  API_ADAPTER_MISSING_HOST: "api_adapter_missing_host",
  API_ADAPTER_RESPONSE_FAILED: "api_adapter_response_failed",
  API_HEADERS_ALREADY_SENT: "api_headers_already_sent",
  API_AUTH_TOKEN_EXPIRED: "api_auth_token_expired",
  API_AUTH_TOKEN_REVOKED: "api_auth_token_revoked",
  API_AUTH_TOKEN_MALFORMED: "api_auth_token_malformed",
  API_AUTH_TOKEN_WRONG_PROJECT: "api_auth_token_wrong_project",
  API_AUTH_VERIFICATION_FAILED: "api_auth_verification_failed",
  API_UNHANDLED_ROUTE_ERROR: "api_unhandled_route_error",
} as const;

export type ErrorId = (typeof ERROR_IDS)[keyof typeof ERROR_IDS];
