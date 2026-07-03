import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import { requireAuth } from "../shared-api/plugins/require-auth.js";
import { verifyAuthToken } from "../shared-api/services/auth/verify-token.js";
import {
  BadgeCatalogResponseSchema,
  ClassCreateRequestSchema,
  ClassPatchRequestSchema,
  ClassResponseSchema,
  UniversityDetailResponseSchema,
} from "./schemas/class-schemas.js";
import {
  PeriodsPutRequestSchema,
  PeriodsResponseSchema,
} from "./schemas/period-schemas.js";
import {
  UniversityCreateRequestSchema,
  UniversityListResponseSchema,
  UniversityPatchRequestSchema,
  UniversityResponseSchema,
} from "./schemas/university-schemas.js";
import { classesService as defaultClasses } from "./services/classes/index.js";
import { periodsService as defaultPeriods } from "./services/periods/index.js";
import { universitiesService as defaultUniversities } from "./services/universities/index.js";
import type { PartialUniversitiesApiServices } from "./types/services.js";

/**
 * Create the universities-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/universities/** → universitiesApi function.
 * Every route runs behind `requireAuth`; scoped writes call assertChancellorOf
 * inside the relevant services.
 */
export function createApp(services?: PartialUniversitiesApiServices) {
  const universities = services?.universitiesService ?? defaultUniversities;
  const periods = services?.periodsService ?? defaultPeriods;
  const classes = services?.classesService ?? defaultClasses;
  const verifyToken = services?.verifyToken ?? verifyAuthToken;

  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .resolve(requireAuth(verifyToken))
    .post(
      "/universities",
      ({ caller, body }) => universities.create(caller, body),
      {
        body: UniversityCreateRequestSchema,
        response: UniversityResponseSchema,
      },
    )
    .get("/universities/mine", ({ caller }) => universities.listMine(caller), {
      response: UniversityListResponseSchema,
    })
    .get("/universities/badges", () => classes.listBadges(), {
      response: BadgeCatalogResponseSchema,
    })
    .get(
      "/universities/:id",
      ({ caller, params }) => universities.getDetail(caller, params.id),
      { response: UniversityDetailResponseSchema },
    )
    .patch(
      "/universities/:id",
      ({ caller, params, body }) => universities.patch(caller, params.id, body),
      {
        body: UniversityPatchRequestSchema,
        response: UniversityResponseSchema,
      },
    )
    .delete("/universities/:id", async ({ caller, params, set }) => {
      await universities.remove(caller, params.id);
      set.status = 204;
    })
    .put(
      "/universities/:id/periods",
      ({ caller, params, body }) => periods.put(caller, params.id, body),
      {
        body: PeriodsPutRequestSchema,
        response: PeriodsResponseSchema,
      },
    )
    .post(
      "/universities/:id/classes",
      ({ caller, params, body }) => classes.create(caller, params.id, body),
      {
        body: ClassCreateRequestSchema,
        response: ClassResponseSchema,
      },
    )
    .patch(
      "/universities/:id/classes/:classId",
      ({ caller, params, body }) =>
        classes.patch(caller, params.id, params.classId, body),
      {
        body: ClassPatchRequestSchema,
        response: ClassResponseSchema,
      },
    )
    .delete(
      "/universities/:id/classes/:classId",
      async ({ caller, params, set }) => {
        await classes.remove(caller, params.id, params.classId);
        set.status = 204;
      },
    );
}

export const app = createApp();
