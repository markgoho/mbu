import { afterEach, describe, expect, it } from "bun:test";
import type { Logger } from "../../types/logger.js";
import { sendEmail } from "./email-service.js";

function fakeLogger(): Logger & {
  calls: Array<{ level: string; message: string }>;
} {
  const calls: Array<{ level: string; message: string }> = [];
  return {
    calls,
    info: message => calls.push({ level: "info", message }),
    warn: message => calls.push({ level: "warn", message }),
    error: message => calls.push({ level: "error", message }),
  };
}

describe("sendEmail", () => {
  const originalEmulatorFlag = process.env["FUNCTIONS_EMULATOR"];
  const originalApiKey = process.env["MAILGUN_API_KEY"];

  afterEach(() => {
    process.env["FUNCTIONS_EMULATOR"] = originalEmulatorFlag;
    process.env["MAILGUN_API_KEY"] = originalApiKey;
  });

  it("skips the network call in the emulator and returns a stub id", async () => {
    process.env["FUNCTIONS_EMULATOR"] = "true";
    const logger = fakeLogger();

    const result = await sendEmail(
      {
        message: {
          to: "parent@example.com",
          subject: "Hi",
          html: "<p>Hi</p>",
          text: "Hi",
        },
      },
      logger,
    );

    expect(result).toEqual({ messageId: "emulator-skip" });
    expect(logger.calls).toEqual([
      { level: "info", message: "email.sendEmail emulator skip" },
    ]);
  });

  it("throws a retryable=false EmailSendError when the API key is missing", async () => {
    process.env["FUNCTIONS_EMULATOR"] = "false";
    delete process.env["MAILGUN_API_KEY"];
    const logger = fakeLogger();

    await expect(
      sendEmail(
        {
          message: {
            to: "parent@example.com",
            subject: "Hi",
            html: "<p>Hi</p>",
            text: "Hi",
          },
        },
        logger,
      ),
    ).rejects.toMatchObject({
      errorId: "mailgun_auth_failed",
      retryable: false,
    });
  });
});
