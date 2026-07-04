import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import type { Notifier } from "../services/notifier/interface.js";
import type { RegistrationsService } from "../services/registrations/interface.js";

/**
 * Injectable dependencies for the registrations-api app. Tests override any subset;
 * production uses the live defaults wired in app.ts.
 */
export interface RegistrationsApiServices {
  registrationsService: RegistrationsService;
  notifier: Notifier;
  /** Token verifier used by the requireAuth resolver (fakeable in tests). */
  verifyToken: TokenVerifier;
}

export type PartialRegistrationsApiServices = Partial<RegistrationsApiServices>;
