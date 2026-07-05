import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import { createRegistrationsPlugin } from "./plugins/registrations-plugin.js";
import type { PartialRegistrationsApiServices } from "./types/services.js";

/**
 * Create the registrations-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/registrations/** → registrationsApi function.
 * All routes run behind the plugin's `requireAuth` resolver.
 */
export function createApp(services?: PartialRegistrationsApiServices) {
  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .use(createRegistrationsPlugin(services));
}

export const app = createApp();
