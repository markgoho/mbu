import type { Caller } from "../../shared-api/types/caller.js";
import type {
  BootstrapResponse,
  OnboardingRequest,
  UserResponse,
} from "../schemas/user-schemas.js";
import type { UsersService } from "../services/users/interface.js";

/**
 * Route logic for the authenticated /users/me endpoints. The plugin guard has
 * already verified identity, so each function receives the resolved `caller`
 * and carries no auth code — it simply delegates to the injected service.
 */

export function bootstrapUser(
  users: UsersService,
  caller: Caller,
): Promise<BootstrapResponse> {
  return users.bootstrap(caller);
}

export function getMe(
  users: UsersService,
  caller: Caller,
): Promise<UserResponse> {
  return users.getMe(caller);
}

export function onboardUser(
  users: UsersService,
  caller: Caller,
  body: OnboardingRequest,
): Promise<UserResponse> {
  return users.onboard(caller, body);
}

export async function deleteAccount(
  users: UsersService,
  caller: Caller,
  set: { status?: number | string },
): Promise<void> {
  await users.deleteAccount(caller);
  set.status = 204;
}

export function ackRosterExport(
  users: UsersService,
  caller: Caller,
): Promise<UserResponse> {
  return users.ackRosterExport(caller);
}
