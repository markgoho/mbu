import type { Caller } from "../../../shared-api/types/caller.js";
import type { UniversityDetailResponse } from "../../schemas/class-schemas.js";
import type {
  UniversityCreateRequest,
  UniversityListResponse,
  UniversityPatchRequest,
  UniversityResponse,
} from "../../schemas/university-schemas.js";

export interface UniversitiesService {
  create(
    caller: Caller,
    request: UniversityCreateRequest,
  ): Promise<UniversityResponse>;
  patch(
    caller: Caller,
    universityId: string,
    request: UniversityPatchRequest,
  ): Promise<UniversityResponse>;
  listMine(caller: Caller): Promise<UniversityListResponse>;
  getDetail(
    caller: Caller,
    universityId: string,
  ): Promise<UniversityDetailResponse>;
  remove(caller: Caller, universityId: string): Promise<void>;
}
