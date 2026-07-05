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
  /**
   * Right-to-erasure: deletes every owned scout (cascading their active
   * registrations), revokes active counselor grants, deletes the user doc,
   * and deletes the Firebase Auth user. Blocked while the caller holds an
   * active chancellor grant on a published/submitted/needs_review event —
   * close or draft it first.
   */
  deleteAccount(caller: Caller): Promise<void>;
}
