import { logger } from "firebase-functions/v2";
import type { Notifier } from "./interface.js";

/**
 * No-op notifier: logs the event and does not deliver anything. Replace with
 * a real delivery implementation (email/push) in a later phase.
 */
export const notifier: Notifier = {
  async registered(event) {
    logger.info("notifier.registered (no-op)", event);
  },
  async promoted(event) {
    logger.info("notifier.promoted (no-op)", event);
  },
};
