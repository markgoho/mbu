import type { Caller } from "../../shared-api/types/caller.js";
import type {
  ClassCreateRequest,
  ClassResponse,
} from "../schemas/class-schemas.js";
import type { ClassesService } from "../services/classes/interface.js";

export function createClassLogic({
  classesService,
  caller,
  universityId,
  body,
}: {
  classesService: ClassesService;
  caller: Caller;
  universityId: string;
  body: ClassCreateRequest;
}): Promise<ClassResponse> {
  return classesService.create(caller, universityId, body);
}
