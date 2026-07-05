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
  /**
   * Hard-delete; 404 if missing. Cascades: cancels (and hard-deletes) every
   * active registration for this scout, promoting waitlisted scouts as
   * seats free up, before deleting the scout profile.
   */
  remove(caller: Caller, scoutId: string): Promise<void>;
}
