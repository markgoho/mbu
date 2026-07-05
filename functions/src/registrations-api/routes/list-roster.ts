import type { Caller } from "../../shared-api/types/caller.js";
import type { RosterResponse } from "../schemas/registration-schemas.js";
import type { RegistrationsService } from "../services/registrations/interface.js";

/**
 * List class rosters for an event. Chancellors see all classes; counselors see
 * only their active class grants (scoping enforced inside the service).
 */
export function listRosterLogic({
  caller,
  universityId,
  registrationsService,
}: {
  caller: Caller;
  universityId: string;
  registrationsService: RegistrationsService;
}): Promise<RosterResponse> {
  return registrationsService.listRoster(caller, universityId);
}
