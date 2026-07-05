import type { Caller } from "../../shared-api/types/caller.js";
import type {
  UniversityCreateRequest,
  UniversityResponse,
} from "../schemas/university-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export function createUniversityLogic({
  universitiesService,
  caller,
  body,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
  body: UniversityCreateRequest;
}): Promise<UniversityResponse> {
  return universitiesService.create(caller, body);
}
