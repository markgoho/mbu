import type { Caller } from "../../shared-api/types/caller.js";
import type {
  ClassPatchRequest,
  ClassResponse,
} from "../schemas/class-schemas.js";
import type { ClassesService } from "../services/classes/interface.js";

export function patchClassLogic({
  classesService,
  caller,
  universityId,
  classId,
  body,
}: {
  classesService: ClassesService;
  caller: Caller;
  universityId: string;
  classId: string;
  body: ClassPatchRequest;
}): Promise<ClassResponse> {
  return classesService.patch(caller, universityId, classId, body);
}
