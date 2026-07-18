import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import {
  createHealthPlugin,
  type PartialHealthApiServices,
} from "./plugins/health-plugin.js";

/**
 * Create health-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/health → healthApi function.
 */
export function createApp(services?: PartialHealthApiServices) {
  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .use(createHealthPlugin(services));
}

export const app = createApp();
