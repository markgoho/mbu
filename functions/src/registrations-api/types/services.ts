import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import type { RegistrationsService } from "../services/registrations/interface.js";

/**
 * Injectable dependencies for the registrations-api app. Tests override any
 * subset; production uses the live defaults wired in the plugin. The notifier
 * is an internal detail of the default `RegistrationsService` — boundary tests
 * mock the service itself, so it is not injected here.
 */
export interface RegistrationsApiServices {
  registrationsService: RegistrationsService;
  /** Token verifier used by the requireAuth resolver (fakeable in tests). */
  verifyToken: TokenVerifier;
}

export type PartialRegistrationsApiServices = Partial<RegistrationsApiServices>;
