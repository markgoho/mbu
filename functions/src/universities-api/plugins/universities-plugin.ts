import { Elysia } from "elysia";
import { requireAuth } from "../../shared-api/plugins/require-auth.js";
import { verifyAuthToken } from "../../shared-api/services/auth/verify-token.js";
import { approveLogic } from "../routes/approve.js";
import { closeLogic } from "../routes/close.js";
import { createClassLogic } from "../routes/create-class.js";
import { createUniversityLogic } from "../routes/create-university.js";
import { deleteClassLogic } from "../routes/delete-class.js";
import { deleteUniversityLogic } from "../routes/delete-university.js";
import { getDetailLogic } from "../routes/get-detail.js";
import { listBadgesLogic } from "../routes/list-badges.js";
import { listMineLogic } from "../routes/list-mine.js";
import { patchClassLogic } from "../routes/patch-class.js";
import { patchUniversityLogic } from "../routes/patch-university.js";
import { putPeriodsLogic } from "../routes/put-periods.js";
import { rejectLogic } from "../routes/reject.js";
import { reviewQueueLogic } from "../routes/review-queue.js";
import { submitLogic } from "../routes/submit.js";
import {
  BadgeCatalogResponseSchema,
  ClassCreateRequestSchema,
  ClassPatchRequestSchema,
  ClassResponseSchema,
  UniversityDetailResponseSchema,
} from "../schemas/class-schemas.js";
import {
  PeriodsPutRequestSchema,
  PeriodsResponseSchema,
} from "../schemas/period-schemas.js";
import {
  RejectRequestSchema,
  ReviewQueueResponseSchema,
  UniversityCreateRequestSchema,
  UniversityListResponseSchema,
  UniversityPatchRequestSchema,
  UniversityResponseSchema,
} from "../schemas/university-schemas.js";
import { ClassesServiceImpl } from "../services/classes/index.js";
import { PeriodsServiceImpl } from "../services/periods/index.js";
import { UniversitiesServiceImpl } from "../services/universities/index.js";
import type { PartialUniversitiesApiServices } from "../types/services.js";

/**
 * Authenticated + admin routes for universities-api. The `requireAuth` resolve
 * runs first (401 for a missing/invalid token, 403 EMAIL_NOT_VERIFIED for an
 * unverified session), decorating a verified `caller`. Scoped authorization
 * (assertChancellorOf) and super-admin checks live inside the services, so
 * admin routes surface a 403 to non-super-admins through the same path.
 */
export function createUniversitiesPlugin(
  services?: PartialUniversitiesApiServices,
) {
  const universities = services?.universitiesService ?? UniversitiesServiceImpl;
  const periods = services?.periodsService ?? PeriodsServiceImpl;
  const classes = services?.classesService ?? ClassesServiceImpl;
  const verifyToken = services?.verifyToken ?? verifyAuthToken;

  return new Elysia({ name: "universities" })
    .resolve(requireAuth(verifyToken))
    .post(
      "/universities",
      ({ caller, body }) =>
        createUniversityLogic({
          universitiesService: universities,
          caller,
          body,
        }),
      {
        body: UniversityCreateRequestSchema,
        response: UniversityResponseSchema,
      },
    )
    .get(
      "/universities/mine",
      ({ caller }) =>
        listMineLogic({ universitiesService: universities, caller }),
      { response: UniversityListResponseSchema },
    )
    .get(
      "/universities/badges",
      () => listBadgesLogic({ classesService: classes }),
      {
        response: BadgeCatalogResponseSchema,
      },
    )
    .get(
      "/universities/:id",
      ({ caller, params }) =>
        getDetailLogic({
          universitiesService: universities,
          caller,
          universityId: params.id,
        }),
      { response: UniversityDetailResponseSchema },
    )
    .patch(
      "/universities/:id",
      ({ caller, params, body }) =>
        patchUniversityLogic({
          universitiesService: universities,
          caller,
          universityId: params.id,
          body,
        }),
      {
        body: UniversityPatchRequestSchema,
        response: UniversityResponseSchema,
      },
    )
    .delete("/universities/:id", ({ caller, params, set }) =>
      deleteUniversityLogic({
        universitiesService: universities,
        caller,
        universityId: params.id,
        set,
      }),
    )
    .put(
      "/universities/:id/periods",
      ({ caller, params, body }) =>
        putPeriodsLogic({
          periodsService: periods,
          caller,
          universityId: params.id,
          body,
        }),
      {
        body: PeriodsPutRequestSchema,
        response: PeriodsResponseSchema,
      },
    )
    .post(
      "/universities/:id/classes",
      ({ caller, params, body }) =>
        createClassLogic({
          classesService: classes,
          caller,
          universityId: params.id,
          body,
        }),
      {
        body: ClassCreateRequestSchema,
        response: ClassResponseSchema,
      },
    )
    .patch(
      "/universities/:id/classes/:classId",
      ({ caller, params, body }) =>
        patchClassLogic({
          classesService: classes,
          caller,
          universityId: params.id,
          classId: params.classId,
          body,
        }),
      {
        body: ClassPatchRequestSchema,
        response: ClassResponseSchema,
      },
    )
    .delete("/universities/:id/classes/:classId", ({ caller, params, set }) =>
      deleteClassLogic({
        classesService: classes,
        caller,
        universityId: params.id,
        classId: params.classId,
        set,
      }),
    )
    .post(
      "/universities/:id/submit",
      ({ caller, params }) =>
        submitLogic({
          universitiesService: universities,
          caller,
          universityId: params.id,
        }),
      { response: UniversityResponseSchema },
    )
    .post(
      "/universities/:id/close",
      ({ caller, params }) =>
        closeLogic({
          universitiesService: universities,
          caller,
          universityId: params.id,
        }),
      { response: UniversityResponseSchema },
    )
    .get(
      "/admin/universities/review-queue",
      ({ caller }) =>
        reviewQueueLogic({ universitiesService: universities, caller }),
      { response: ReviewQueueResponseSchema },
    )
    .post(
      "/admin/universities/:id/approve",
      ({ caller, params }) =>
        approveLogic({
          universitiesService: universities,
          caller,
          universityId: params.id,
        }),
      { response: UniversityResponseSchema },
    )
    .post(
      "/admin/universities/:id/reject",
      ({ caller, params, body }) =>
        rejectLogic({
          universitiesService: universities,
          caller,
          universityId: params.id,
          note: body.note,
        }),
      { body: RejectRequestSchema, response: UniversityResponseSchema },
    );
}
