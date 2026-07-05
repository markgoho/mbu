import { Elysia } from "elysia";
import { mapError } from "../../shared-api/errors/on-error.js";
import { requireAuth } from "../../shared-api/plugins/require-auth.js";
import { verifyAuthToken } from "../../shared-api/services/auth/verify-token.js";
import {
  createScout,
  listScouts,
  removeScout,
  updateScout,
} from "../routes/scouts.js";
import {
  ackRosterExport,
  bootstrapUser,
  deleteAccount,
  getMe,
  onboardUser,
} from "../routes/users.js";
import {
  ScoutListResponseSchema,
  ScoutRequestSchema,
  ScoutResponseSchema,
} from "../schemas/scout-schemas.js";
import {
  BootstrapResponseSchema,
  OnboardingRequestSchema,
  UserResponseSchema,
} from "../schemas/user-schemas.js";
import { scoutsService as defaultScouts } from "../services/scouts/index.js";
import { usersService as defaultUsers } from "../services/users/index.js";
import type { PartialUsersApiServices } from "../types/services.js";

/**
 * Users plugin — the parent/scout self-service routes.
 *
 * Every route runs behind `requireAuth` (verified identity required); the
 * resolved `caller` is handed to each route logic function so handlers carry no
 * auth code. Authorization for scoped actions lives in the services. `mapError`
 * is attached here so the plugin maps thrown `HttpError`s (including the auth
 * resolver's 401/403) to responses when exercised in isolation.
 *
 * Firebase rewrite: /api/users/** → usersApi function. Plugin routes are
 * defined without the /api prefix — the app factory supplies it.
 *
 * @param services - Optional services to inject (defaults to real objects).
 */
export function createUsersPlugin(services?: PartialUsersApiServices) {
  const users = services?.usersService ?? defaultUsers;
  const scouts = services?.scoutsService ?? defaultScouts;
  const verifyToken = services?.verifyToken ?? verifyAuthToken;

  return new Elysia({ name: "users" })
    .onError(mapError)
    .resolve(requireAuth(verifyToken))
    .post("/users/me", ({ caller }) => bootstrapUser(users, caller), {
      response: BootstrapResponseSchema,
    })
    .get("/users/me", ({ caller }) => getMe(users, caller), {
      response: UserResponseSchema,
    })
    .patch(
      "/users/me",
      ({ caller, body }) => onboardUser(users, caller, body),
      {
        body: OnboardingRequestSchema,
        response: UserResponseSchema,
      },
    )
    .delete("/users/me", ({ caller, set }) => deleteAccount(users, caller, set))
    .post(
      "/users/me/roster-export-ack",
      ({ caller }) => ackRosterExport(users, caller),
      { response: UserResponseSchema },
    )
    .get("/users/me/scouts", ({ caller }) => listScouts(scouts, caller), {
      response: ScoutListResponseSchema,
    })
    .post(
      "/users/me/scouts",
      ({ caller, body }) => createScout(scouts, caller, body),
      { body: ScoutRequestSchema, response: ScoutResponseSchema },
    )
    .patch(
      "/users/me/scouts/:scoutId",
      ({ caller, params, body }) =>
        updateScout(scouts, caller, params.scoutId, body),
      { body: ScoutRequestSchema, response: ScoutResponseSchema },
    )
    .delete("/users/me/scouts/:scoutId", ({ caller, params, set }) =>
      removeScout(scouts, caller, params.scoutId, set),
    );
}
