import type { Caller } from "../../shared-api/types/caller.js";
import type {
  UniversityPatchRequest,
  UniversityResponse,
} from "../schemas/university-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export function patchUniversityLogic({
  universitiesService,
  caller,
  universityId,
  body,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
  universityId: string;
  body: UniversityPatchRequest;
}): Promise<UniversityResponse> {
  return universitiesService.patch(caller, universityId, body);
}
