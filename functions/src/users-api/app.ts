import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import { requireAuth } from "../shared-api/plugins/require-auth.js";
import { verifyAuthToken } from "../shared-api/services/auth/verify-token.js";
import {
  ScoutListResponseSchema,
  ScoutRequestSchema,
  ScoutResponseSchema,
} from "./schemas/scout-schemas.js";
import {
  BootstrapResponseSchema,
  OnboardingRequestSchema,
  UserResponseSchema,
} from "./schemas/user-schemas.js";
import { scoutsService as defaultScouts } from "./services/scouts/index.js";
import { usersService as defaultUsers } from "./services/users/index.js";
import type { PartialUsersApiServices } from "./types/services.js";

/**
 * Create the users-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/users/** → usersApi function. Every route runs
 * behind `requireAuth` (verified identity required); authorization for scoped
 * actions uses the shared-api/authz primitives inside the relevant services.
 */
export function createApp(services?: PartialUsersApiServices) {
  const users = services?.usersService ?? defaultUsers;
  const scouts = services?.scoutsService ?? defaultScouts;
  const verifyToken = services?.verifyToken ?? verifyAuthToken;

  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .resolve(requireAuth(verifyToken))
    .post("/users/me", ({ caller }) => users.bootstrap(caller), {
      response: BootstrapResponseSchema,
    })
    .get("/users/me", ({ caller }) => users.getMe(caller), {
      response: UserResponseSchema,
    })
    .patch("/users/me", ({ caller, body }) => users.onboard(caller, body), {
      body: OnboardingRequestSchema,
      response: UserResponseSchema,
    })
    .delete("/users/me", async ({ caller, set }) => {
      await users.deleteAccount(caller);
      set.status = 204;
    })
    .get("/users/me/scouts", ({ caller }) => scouts.list(caller), {
      response: ScoutListResponseSchema,
    })
    .post(
      "/users/me/scouts",
      ({ caller, body }) => scouts.create(caller, body),
      {
        body: ScoutRequestSchema,
        response: ScoutResponseSchema,
      },
    )
    .patch(
      "/users/me/scouts/:scoutId",
      ({ caller, params, body }) => scouts.update(caller, params.scoutId, body),
      { body: ScoutRequestSchema, response: ScoutResponseSchema },
    )
    .delete("/users/me/scouts/:scoutId", async ({ caller, params, set }) => {
      await scouts.remove(caller, params.scoutId);
      set.status = 204;
    });
}

export const app = createApp();
