/**
 * Typed Mailgun send failure. `retryable` distinguishes transient failures
 * (network blips, 429, 5xx) from permanent ones (bad auth, invalid recipient)
 * so callers can decide whether a resend is worth attempting.
 */
export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly errorId: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Classifies a thrown Mailgun/network error into a typed, retryable-aware error. */
export function parseMailgunError(error: unknown): EmailSendError {
  const baseMessage = "Failed to send email via Mailgun";

  if (!(error instanceof Error)) {
    return new EmailSendError(
      `${baseMessage}: unknown error`,
      "mailgun_unknown",
      false,
    );
  }

  const withStatus = error as Error & { status?: number; statusCode?: number };
  const statusCode = withStatus.status ?? withStatus.statusCode;
  switch (statusCode) {
    case 401:
    case 403:
      return new EmailSendError(
        `${baseMessage}: authentication failed`,
        "mailgun_auth_failed",
        false,
      );
    case 400:
      return new EmailSendError(
        `${baseMessage}: invalid recipient`,
        "mailgun_invalid_recipient",
        false,
      );
    case 404:
      return new EmailSendError(
        `${baseMessage}: domain not configured`,
        "mailgun_domain_not_configured",
        false,
      );
    case 429:
      return new EmailSendError(
        `${baseMessage}: rate limited`,
        "mailgun_rate_limited",
        true,
      );
    case 503:
    case 504:
      return new EmailSendError(
        `${baseMessage}: service unavailable`,
        "mailgun_network_error",
        true,
      );
    default:
      break;
  }

  const withCode = error as Error & { code?: string };
  const networkCodes = [
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ECONNRESET",
    "ENETUNREACH",
  ];
  if (withCode.code && networkCodes.includes(withCode.code)) {
    return new EmailSendError(
      `${baseMessage}: ${error.message}`,
      "mailgun_network_error",
      true,
    );
  }

  return new EmailSendError(
    `${baseMessage}: ${error.message}`,
    "mailgun_unknown",
    true,
  );
}
