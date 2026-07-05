import type { Caller } from "../../shared-api/types/caller.js";
import type { RegistrationsService } from "../services/registrations/interface.js";

/** Cancel (drop) a scout's registration; responds 204 with no body. */
export async function cancelLogic({
  caller,
  universityId,
  classId,
  scoutId,
  registrationsService,
  set,
}: {
  caller: Caller;
  universityId: string;
  classId: string;
  scoutId: string;
  registrationsService: RegistrationsService;
  set: { status?: number | string };
}): Promise<void> {
  await registrationsService.cancel(caller, universityId, classId, scoutId);
  set.status = 204;
}
