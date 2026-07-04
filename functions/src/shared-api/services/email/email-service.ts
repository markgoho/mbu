import Mailgun from "mailgun.js";
import type { Logger } from "../../types/logger.js";
import { EMAIL_DOMAIN, FROM_ADDRESS } from "./constants.js";
import { EmailSendError, parseMailgunError } from "./errors.js";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  messageId: string;
}

/**
 * Thin Mailgun wrapper. Framework-free (no firebase-functions import) so it
 * stays usable outside of Cloud Functions and easy to unit test.
 *
 * Emulator hard-skip: when running under the Firebase emulator, no network
 * call is made and a deterministic stub id is returned so emulator-backed
 * integration tests still see a normal `sent` emailLog entry.
 */
export async function sendEmail(
  { message }: { message: EmailMessage },
  logger: Logger,
): Promise<SendEmailResult> {
  if (process.env["FUNCTIONS_EMULATOR"] === "true") {
    logger.info("email.sendEmail emulator skip", {
      to: message.to,
      subject: message.subject,
    });
    return { messageId: "emulator-skip" };
  }

  const apiKey = process.env["MAILGUN_API_KEY"];
  if (!apiKey) {
    throw new EmailSendError(
      "MAILGUN_API_KEY is not configured",
      "mailgun_auth_failed",
      false,
    );
  }

  try {
    const mailgun = new Mailgun(FormData);
    const client = mailgun.client({ username: "api", key: apiKey });
    const response = await client.messages.create(EMAIL_DOMAIN, {
      from: FROM_ADDRESS,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { messageId: response.id ?? "unknown" };
  } catch (error) {
    const emailError = parseMailgunError(error);
    logger.error("email.sendEmail failed", {
      errorId: emailError.errorId,
      retryable: emailError.retryable,
      to: message.to,
      subject: message.subject,
    });
    throw emailError;
  }
}
