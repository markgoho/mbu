import type { Caller } from "../../shared-api/types/caller.js";
import type { UniversitiesService } from "../services/universities/interface.js";

export async function deleteUniversityLogic({
  universitiesService,
  caller,
  universityId,
  set,
}: {
  universitiesService: UniversitiesService;
  caller: Caller;
  universityId: string;
  set: { status?: number | string };
}): Promise<void> {
  await universitiesService.remove(caller, universityId);
  set.status = 204;
}
