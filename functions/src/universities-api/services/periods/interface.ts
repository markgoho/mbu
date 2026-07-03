import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  PeriodsPutRequest,
  PeriodsResponse,
} from "../../schemas/period-schemas.js";

export interface PeriodsService {
  put(
    caller: Caller,
    universityId: string,
    request: PeriodsPutRequest,
  ): Promise<PeriodsResponse>;
}
