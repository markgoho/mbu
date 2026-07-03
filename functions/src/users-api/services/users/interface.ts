import type { Caller } from "../../../shared-api/types/caller.js";
import type {
  BootstrapResponse,
  OnboardingRequest,
  UserResponse,
} from "../../schemas/user-schemas.js";

export interface UsersService {
  /**
   * Idempotently create-or-refresh the caller's user doc, claim any pending
   * counselor invites addressed to their email, and report whether onboarding
   * consent is still required.
   */
  bootstrap(caller: Caller): Promise<BootstrapResponse>;
  /** Read the caller's user doc (404 if it does not exist yet). */
  getMe(caller: Caller): Promise<UserResponse>;
  /** Record displayName + Terms/Privacy consent timestamps. */
  onboard(caller: Caller, request: OnboardingRequest): Promise<UserResponse>;
}
