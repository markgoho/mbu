import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  ScoutListResponse,
  ScoutRequest,
  ScoutResponse,
} from "../../schemas/scout-schemas.js";

export interface ScoutsService {
  list(caller: Caller): Promise<ScoutListResponse>;
  create(caller: Caller, request: ScoutRequest): Promise<ScoutResponse>;
  update(
    caller: Caller,
    scoutId: string,
    request: ScoutRequest,
  ): Promise<ScoutResponse>;
  /** Hard-delete; 404 if missing. Cascade vs active registrations is #84. */
  remove(caller: Caller, scoutId: string): Promise<void>;
}
