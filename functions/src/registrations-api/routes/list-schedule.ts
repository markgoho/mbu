import type { Caller } from "../../shared-api/types/caller.js";
import type { ScheduleResponse } from "../schemas/registration-schemas.js";
import type { RegistrationsService } from "../services/registrations/interface.js";

/** List the caller's active registrations across their scouts for an event. */
export function listScheduleLogic({
  caller,
  universityId,
  registrationsService,
}: {
  caller: Caller;
  universityId: string;
  registrationsService: RegistrationsService;
}): Promise<ScheduleResponse> {
  return registrationsService.listSchedule(caller, universityId);
}
