import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import { createUniversitiesPlugin } from "./plugins/universities-plugin.js";
import { createUniversitiesPublicPlugin } from "./plugins/universities-public-plugin.js";
import type { PartialUniversitiesApiServices } from "./types/services.js";

/**
 * Create the universities-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes both /api/universities/** and
 * /api/admin/universities/** → the universitiesApi function. The public event
 * read is registered on its own plugin WITHOUT the auth resolver (link-only
 * access); every other route lives on the authenticated plugin behind
 * `requireAuth`. Scoped writes call assertChancellorOf/requireSuperAdmin inside
 * the relevant services.
 */
export function createApp(services?: PartialUniversitiesApiServices) {
  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .use(createUniversitiesPublicPlugin(services))
    .use(createUniversitiesPlugin(services));
}

export const app = createApp();
