import type { Caller } from "../../shared-api/types/caller.js";
import type { ClassesService } from "../services/classes/interface.js";

export async function deleteClassLogic({
  classesService,
  caller,
  universityId,
  classId,
  set,
}: {
  classesService: ClassesService;
  caller: Caller;
  universityId: string;
  classId: string;
  set: { status?: number | string };
}): Promise<void> {
  await classesService.remove(caller, universityId, classId);
  set.status = 204;
}
