import { logger } from "firebase-functions/v2";
import type { ClassChangeNotifier } from "./interface.js";

/**
 * No-op notifier: logs the event and does not deliver anything. #108 replaces
 * this with a real Mailgun-backed implementation once the draft-edit gate is
 * lifted and there can be real recipients.
 */
export const classChangeNotifier: ClassChangeNotifier = {
  async classCancelled(event) {
    logger.info("classChangeNotifier.classCancelled (no-op)", event);
  },
  async classChanged(event) {
    logger.info("classChangeNotifier.classChanged (no-op)", event);
  },
};
