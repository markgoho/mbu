import type { Caller } from "../../shared-api/types/caller.js";
import type {
  ScoutListResponse,
  ScoutRequest,
  ScoutResponse,
} from "../schemas/scout-schemas.js";
import type { ScoutsService } from "../services/scouts/interface.js";

/**
 * Route logic for the authenticated /users/me/scouts endpoints. The plugin
 * guard has already verified identity; each function receives the resolved
 * `caller` and delegates to the injected service.
 */

export function listScouts(
  scouts: ScoutsService,
  caller: Caller,
): Promise<ScoutListResponse> {
  return scouts.list(caller);
}

export function createScout(
  scouts: ScoutsService,
  caller: Caller,
  body: ScoutRequest,
): Promise<ScoutResponse> {
  return scouts.create(caller, body);
}

export function updateScout(
  scouts: ScoutsService,
  caller: Caller,
  scoutId: string,
  body: ScoutRequest,
): Promise<ScoutResponse> {
  return scouts.update(caller, scoutId, body);
}

export async function removeScout(
  scouts: ScoutsService,
  caller: Caller,
  scoutId: string,
  set: { status?: number | string },
): Promise<void> {
  await scouts.remove(caller, scoutId);
  set.status = 204;
}
