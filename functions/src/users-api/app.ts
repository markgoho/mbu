import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import { createUsersPlugin } from "./plugins/users-plugin.js";
import type { PartialUsersApiServices } from "./types/services.js";

/**
 * Create the users-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/users/** → usersApi function. The `/api` prefix
 * must match the firebase.json rewrite exactly (Hosting forwards the full
 * path); all route/auth behavior lives in `createUsersPlugin`.
 */
export function createApp(services?: PartialUsersApiServices) {
  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .use(createUsersPlugin(services));
}

export const app = createApp();
