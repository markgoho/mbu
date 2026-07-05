import type { Caller } from "../../../shared-api/types/caller.js";
import type { UniversityDetailResponse } from "../../schemas/class-schemas.js";
import type { PublicUniversityResponse } from "../../schemas/public-schemas.js";
import type {
  ReviewQueueResponse,
  UniversityCreateRequest,
  UniversityListResponse,
  UniversityPatchRequest,
  UniversityResponse,
} from "../../schemas/university-schemas.js";

export interface UniversitiesService {
  getPublic(universityId: string): Promise<PublicUniversityResponse>;
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
  submit(caller: Caller, universityId: string): Promise<UniversityResponse>;
  close(caller: Caller, universityId: string): Promise<UniversityResponse>;
  approve(caller: Caller, universityId: string): Promise<UniversityResponse>;
  reject(
    caller: Caller,
    universityId: string,
    note: string,
  ): Promise<UniversityResponse>;
  listReviewQueue(caller: Caller): Promise<ReviewQueueResponse>;
}
