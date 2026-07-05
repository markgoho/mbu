import type { Caller } from "../../shared-api/types/caller.js";
import type {
  PeriodsPutRequest,
  PeriodsResponse,
} from "../schemas/period-schemas.js";
import type { PeriodsService } from "../services/periods/interface.js";

export function putPeriodsLogic({
  periodsService,
  caller,
  universityId,
  body,
}: {
  periodsService: PeriodsService;
  caller: Caller;
  universityId: string;
  body: PeriodsPutRequest;
}): Promise<PeriodsResponse> {
  return periodsService.put(caller, universityId, body);
}
