import { Elysia } from "elysia";
import { mapError } from "../../shared-api/errors/on-error.js";
import { requireAuth } from "../../shared-api/plugins/require-auth.js";
import { verifyAuthToken } from "../../shared-api/services/auth/verify-token.js";
import { cancelLogic } from "../routes/cancel.js";
import { listRosterLogic } from "../routes/list-roster.js";
import { listScheduleLogic } from "../routes/list-schedule.js";
import { registerLogic } from "../routes/register.js";
import {
  RegisterRequestSchema,
  RegistrationResponseSchema,
  RosterResponseSchema,
  ScheduleResponseSchema,
} from "../schemas/registration-schemas.js";
import { registrationsService as defaultRegistrationsService } from "../services/registrations/index.js";
import {
  SERVICE_KEYS,
  type PartialRegistrationsApiServices,
} from "../types/services.js";

/**
 * Registrations plugin. Every route runs behind `requireAuth` (there is no
 * public read here, unlike universities-api). The service methods throw typed
 * HttpErrors; the app-level `onError(mapError)` maps them to responses.
 *
 * Firebase rewrite: /api/registrations/** → registrationsApi function. Routes
 * are defined without the /api prefix — the app's prefix supplies it.
 */
export function createRegistrationsPlugin(
  services?: PartialRegistrationsApiServices,
) {
  const verifyToken = services?.verifyToken ?? verifyAuthToken;

  return new Elysia({ name: "registrations" })
    .onError(mapError)
    .decorate(
      SERVICE_KEYS.REGISTRATIONS_SERVICE,
      services?.registrationsService ?? defaultRegistrationsService,
    )
    .resolve(requireAuth(verifyToken))
    .post(
      "/registrations/:universityId/:classId",
      ({ caller, params, body, registrationsService }) =>
        registerLogic({
          caller,
          universityId: params.universityId,
          classId: params.classId,
          body,
          registrationsService,
        }),
      {
        body: RegisterRequestSchema,
        response: RegistrationResponseSchema,
      },
    )
    .delete(
      "/registrations/:universityId/:classId/:scoutId",
      ({ caller, params, registrationsService, set }) =>
        cancelLogic({
          caller,
          universityId: params.universityId,
          classId: params.classId,
          scoutId: params.scoutId,
          registrationsService,
          set,
        }),
    )
    .get(
      "/registrations/:universityId/roster",
      ({ caller, params, registrationsService }) =>
        listRosterLogic({
          caller,
          universityId: params.universityId,
          registrationsService,
        }),
      { response: RosterResponseSchema },
    )
    .get(
      "/registrations/:universityId",
      ({ caller, params, registrationsService }) =>
        listScheduleLogic({
          caller,
          universityId: params.universityId,
          registrationsService,
        }),
      { response: ScheduleResponseSchema },
    );
}
