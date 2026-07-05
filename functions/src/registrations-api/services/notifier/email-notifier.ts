import { FieldValue, getFirestore } from "firebase-admin/firestore";
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
} from "../../../shared-api/services/email/index.js";
import type { Notifier, PromotedEvent, RegisteredEvent } from "./interface.js";

async function writeLog(
  universityId: string,
  entry: Omit<EmailLogDocument, "createdAt">,
): Promise<void> {
  await getFirestore()
    .collection(emailLogPath(universityId))
    .add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Resolve the parent's live email, render the appropriate template, send via
 * Mailgun, and write a Youth-Protection audit entry (`emailLog`) on both
 * outcomes. Send failures are caught and recorded as a `failed` entry rather
 * than propagated — the caller (registrations service) already treats
 * notification as best-effort, and a failed YP notice must still leave a trace.
 */
async function deliver(
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

  const email = await userEmailReader.getEmail(event.parentUid);
  if (!email) {
    await writeLog(event.universityId, {
      ...base,
      toEmail: null,
      status: "failed",
      mailgunMessageId: null,
      errorId: "missing_email",
    });
    return;
  }

  try {
    const { messageId } = await sendEmail(
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
    await writeLog(event.universityId, {
      ...base,
      toEmail: email,
      status: "sent",
      mailgunMessageId: messageId,
      errorId: null,
    });
  } catch (error) {
    const errorId = error instanceof EmailSendError ? error.errorId : "unknown";
    await writeLog(event.universityId, {
      ...base,
      toEmail: email,
      status: "failed",
      mailgunMessageId: null,
      errorId,
    });
  }
}

async function registered(event: RegisteredEvent): Promise<void> {
  const rendered =
    event.status === "enrolled"
      ? renderRegistrationConfirmation({ badgeTitle: event.badgeTitle })
      : renderWaitlistConfirmation({ badgeTitle: event.badgeTitle });
  await deliver("registered", event, rendered);
}

async function promoted(event: PromotedEvent): Promise<void> {
  const rendered = renderWaitlistPromotion({ badgeTitle: event.badgeTitle });
  await deliver("promoted", event, rendered);
}

/**
 * Production Notifier for registration lifecycle events.
 */
export const emailNotifier: Notifier = {
  registered,
  promoted,
};
