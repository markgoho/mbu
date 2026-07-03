import type { TokenVerifier } from "../../shared-api/plugins/require-auth.js";
import type { ScoutsService } from "../services/scouts/interface.js";
import type { UsersService } from "../services/users/interface.js";

/**
 * Injectable dependencies for the users-api app. Tests override any subset;
 * production uses the live defaults wired in app.ts.
 */
export interface UsersApiServices {
  usersService: UsersService;
  scoutsService: ScoutsService;
  /** Token verifier used by the requireAuth resolver (fakeable in tests). */
  verifyToken: TokenVerifier;
}

export type PartialUsersApiServices = Partial<UsersApiServices>;
