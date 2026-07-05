import type { Caller } from "../../shared-api/types/caller.js";
import type { ReviewQueueResponse } from "../schemas/university-schemas.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export function reviewQueueLogic({
  universitiesService,
  caller,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
}): Promise<ReviewQueueResponse> {
  return universitiesService.listReviewQueue(caller);
}
