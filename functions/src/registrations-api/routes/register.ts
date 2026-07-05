import type { Caller } from "../../shared-api/types/caller.js";
import type {
  RegisterRequest,
  RegistrationResponse,
} from "../schemas/registration-schemas.js";
import type { RegistrationsService } from "../services/registrations/interface.js";

/**
 * Register a scout into a class (auth handled by the plugin's requireAuth
 * resolver; the service throws typed HttpErrors that `mapError` translates).
 */
export function registerLogic({
  caller,
  universityId,
  classId,
  body,
  registrationsService,
}: {
  caller: Caller;
  universityId: string;
  classId: string;
  body: RegisterRequest;
  registrationsService: RegistrationsService;
}): Promise<RegistrationResponse> {
  return registrationsService.register(caller, universityId, classId, body);
}
