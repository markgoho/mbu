import type { Caller } from "../../shared-api/types/caller.js";
import type { UniversityResponse } from "../schemas/university-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export function rejectLogic({
  universitiesService,
  caller,
  universityId,
  note,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
  universityId: string;
  note: string;
}): Promise<UniversityResponse> {
  return universitiesService.reject(caller, universityId, note);
}
