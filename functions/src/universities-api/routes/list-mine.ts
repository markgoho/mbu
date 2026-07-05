import type { Caller } from "../../shared-api/types/caller.js";
import type { UniversityListResponse } from "../schemas/university-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export function listMineLogic({
  universitiesService,
  caller,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
}): Promise<UniversityListResponse> {
  return universitiesService.listMine(caller);
}
