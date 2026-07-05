import type { Caller } from "../../shared-api/types/caller.js";
import type { UniversityDetailResponse } from "../schemas/class-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export function getDetailLogic({
  universitiesService,
  caller,
  universityId,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
  universityId: string;
}): Promise<UniversityDetailResponse> {
  return universitiesService.getDetail(caller, universityId);
}
