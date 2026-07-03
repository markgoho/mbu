import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  BadgeCatalogResponse,
  ClassCreateRequest,
  ClassPatchRequest,
  ClassResponse,
} from "../../schemas/class-schemas.js";

export interface ClassesService {
  create(
    caller: Caller,
    universityId: string,
    request: ClassCreateRequest,
  ): Promise<ClassResponse>;
  patch(
    caller: Caller,
    universityId: string,
    classId: string,
    request: ClassPatchRequest,
  ): Promise<ClassResponse>;
  remove(caller: Caller, universityId: string, classId: string): Promise<void>;
  listBadges(): Promise<BadgeCatalogResponse>;
}
