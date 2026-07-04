import {
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import {
  emailLogPath,
  type EmailLogDocument,
} from "../../../collections/email-log.js";
import {
  EmailSendError,
  renderRegistrationConfirmation,
  renderWaitlistConfirmation,
  renderWaitlistPromotion,
  sendEmail,
  userEmailReader,
  type RenderedEmail,
  type UserEmailReader,
} from "../../../shared-api/services/email/index.js";
import type { Notifier, PromotedEvent, RegisteredEvent } from "./interface.js";

async function writeLog(
  db: Firestore,
  universityId: string,
  entry: Omit<EmailLogDocument, "createdAt">,
): Promise<void> {
  await db.collection(emailLogPath(universityId)).add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Production Notifier: resolves the parent's live email, renders the
 * appropriate template, sends via Mailgun, and writes a Youth-Protection
 * audit entry (`emailLog`) on both outcomes. Send failures are caught and
 * recorded as a `failed` entry rather than propagated — the caller
 * (registrations service) already treats notification as best-effort, and a
 * failed YP notice must still leave a trace.
 */
export class EmailNotifier implements Notifier {
  constructor(
    private readonly userEmail: UserEmailReader = userEmailReader,
    private readonly database?: Firestore,
    private readonly send: typeof sendEmail = sendEmail,
  ) {}

  private db(): Firestore {
    return this.database ?? getFirestore();
  }

  async registered(event: RegisteredEvent): Promise<void> {
    const rendered =
      event.status === "enrolled"
        ? renderRegistrationConfirmation({ badgeTitle: event.badgeTitle })
        : renderWaitlistConfirmation({ badgeTitle: event.badgeTitle });
    await this.deliver("registered", event, rendered);
  }

  async promoted(event: PromotedEvent): Promise<void> {
    const rendered = renderWaitlistPromotion({ badgeTitle: event.badgeTitle });
    await this.deliver("promoted", event, rendered);
  }

  private async deliver(
    type: EmailLogDocument["type"],
    event: RegisteredEvent | PromotedEvent,
    rendered: RenderedEmail,
  ): Promise<void> {
    const base = {
      type,
      toParentUid: event.parentUid,
      scoutId: event.scoutId,
      classId: event.classId,
      subject: rendered.subject,
    };

    const email = await this.userEmail.getEmail(event.parentUid);
    if (!email) {
      await writeLog(this.db(), event.universityId, {
        ...base,
        toEmail: null,
        status: "failed",
        mailgunMessageId: null,
        errorId: "missing_email",
      });
      return;
    }

    try {
      const { messageId } = await this.send(
        {
          message: {
            to: email,
            subject: rendered.subject,
            html: rendered.html,
            text: rendered.text,
          },
        },
        logger,
      );
      await writeLog(this.db(), event.universityId, {
        ...base,
        toEmail: email,
        status: "sent",
        mailgunMessageId: messageId,
        errorId: null,
      });
    } catch (error) {
      const errorId =
        error instanceof EmailSendError ? error.errorId : "unknown";
      await writeLog(this.db(), event.universityId, {
        ...base,
        toEmail: email,
        status: "failed",
        mailgunMessageId: null,
        errorId,
      });
    }
  }
}

export const emailNotifier: Notifier = new EmailNotifier();
