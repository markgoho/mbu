import { describe, expect, it } from "bun:test";
import { Firestore } from "firebase-admin/firestore";
import { EMAIL_LOG_SUBCOLLECTION } from "../../../collections/email-log.js";
import {
  EmailSendError,
  type UserEmailReader,
} from "../../../shared-api/services/email/index.js";
import { EmailNotifier } from "./email-notifier.js";

process.env["FUNCTIONS_EMULATOR"] = "true";

function fakeDb(): Firestore {
  const writes: Array<{ path: string; data: unknown }> = [];
  const db = {
    writes,
    collection(path: string) {
      return {
        add: (data: unknown) => {
          writes.push({ path, data });
          return Promise.resolve();
        },
      };
    },
  };
  return db as unknown as Firestore;
}

describe("EmailNotifier", () => {
  it("logs a sent emailLog entry for an enrolled registration", async () => {
    const userEmail: UserEmailReader = {
      getEmail: () => Promise.resolve("parent@example.com"),
    };
    const db = fakeDb() as unknown as Firestore & {
      writes: Array<{ path: string; data: unknown }>;
    };
    const notifier = new EmailNotifier(userEmail, db);

    await notifier.registered({
      universityId: "uni1",
      classId: "cls1",
      scoutId: "scout1",
      parentUid: "parent1",
      badgeTitle: "Camping",
      status: "enrolled",
    });

    expect(db.writes).toHaveLength(1);
    const write = db.writes[0] as {
      path: string;
      data: Record<string, unknown>;
    };
    expect(write.path).toContain(EMAIL_LOG_SUBCOLLECTION);
    expect(write.data["status"]).toBe("sent");
    expect(write.data["toEmail"]).toBe("parent@example.com");
    expect(write.data["type"]).toBe("registered");
  });

  it("logs a failed emailLog entry and skips the send when the parent has no email", async () => {
    const userEmail: UserEmailReader = {
      getEmail: () => Promise.resolve(null),
    };
    const db = fakeDb() as unknown as Firestore & {
      writes: Array<{ path: string; data: unknown }>;
    };
    const notifier = new EmailNotifier(userEmail, db);

    await notifier.promoted({
      universityId: "uni1",
      classId: "cls1",
      scoutId: "scout1",
      parentUid: "parent1",
      badgeTitle: "Cooking",
    });

    expect(db.writes).toHaveLength(1);
    const write = db.writes[0] as { data: Record<string, unknown> };
    expect(write.data["status"]).toBe("failed");
    expect(write.data["toEmail"]).toBeNull();
    expect(write.data["errorId"]).toBe("missing_email");
  });

  it("records a failed emailLog entry with the send errorId when the transport throws", async () => {
    const userEmail: UserEmailReader = {
      getEmail: () => Promise.resolve("parent@example.com"),
    };
    const db = fakeDb() as unknown as Firestore & {
      writes: Array<{ path: string; data: unknown }>;
    };
    const failingSend = () =>
      Promise.reject(
        new EmailSendError("rate limited", "mailgun_rate_limited", true),
      );
    const notifier = new EmailNotifier(userEmail, db, failingSend);

    await notifier.registered({
      universityId: "uni1",
      classId: "cls1",
      scoutId: "scout1",
      parentUid: "parent1",
      badgeTitle: "Camping",
      status: "enrolled",
    });

    expect(db.writes).toHaveLength(1);
    const write = db.writes[0] as { data: Record<string, unknown> };
    expect(write.data["status"]).toBe("failed");
    expect(write.data["toEmail"]).toBe("parent@example.com");
    expect(write.data["mailgunMessageId"]).toBeNull();
    expect(write.data["errorId"]).toBe("mailgun_rate_limited");
  });
});
