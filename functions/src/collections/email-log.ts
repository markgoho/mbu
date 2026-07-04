import type { Timestamp } from "firebase-admin/firestore";
import { UNIVERSITIES_COLLECTION } from "./universities.js";

export const EMAIL_LOG_SUBCOLLECTION = "emailLog";

/** Firestore path to a university's Youth-Protection email audit subcollection. */
export function emailLogPath(universityId: string): string {
  return `${UNIVERSITIES_COLLECTION}/${universityId}/${EMAIL_LOG_SUBCOLLECTION}`;
}

export type EmailLogType = "registered" | "promoted";

/**
 * Youth-Protection audit trail for every transactional send attempt. Written on
 * both outcomes (sent/failed). Never stores scout name, parent name, or email
 * body — only the scoutId, so a reader can correlate without exposing PII.
 */
export interface EmailLogDocument {
  type: EmailLogType;
  toParentUid: string;
  /** Null when the send was skipped for lack of a resolvable email. */
  toEmail: string | null;
  scoutId: string;
  classId: string;
  subject: string;
  status: "sent" | "failed";
  mailgunMessageId: string | null;
  errorId: string | null;
  createdAt: Timestamp;
}
