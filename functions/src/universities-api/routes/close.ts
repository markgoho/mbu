import type { Caller } from "../../shared-api/types/caller.js";
import type { UniversityResponse } from "../schemas/university-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export function closeLogic({
  universitiesService,
  caller,
  universityId,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
  universityId: string;
}): Promise<UniversityResponse> {
  return universitiesService.close(caller, universityId);
}
