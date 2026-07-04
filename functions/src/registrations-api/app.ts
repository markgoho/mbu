import { node } from "@elysiajs/node";
import { Elysia } from "elysia";
import { mapError } from "../shared-api/errors/on-error.js";
import { requireAuth } from "../shared-api/plugins/require-auth.js";
import { verifyAuthToken } from "../shared-api/services/auth/verify-token.js";
import {
  RegisterRequestSchema,
  RegistrationResponseSchema,
  ScheduleResponseSchema,
} from "./schemas/registration-schemas.js";
import {
  registrationsService as defaultRegistrations,
  RegistrationsServiceImpl,
} from "./services/registrations/index.js";
import type { PartialRegistrationsApiServices } from "./types/services.js";

/**
 * Create the registrations-api Elysia app with injectable dependencies.
 *
 * Firebase hosting routes /api/registrations/** → registrationsApi function.
 * Every route runs behind `requireAuth` — there is no public read here, unlike
 * universities-api's public event GET. If `registrationsService` isn't
 * overridden but `notifier` is, a fresh service is built with that notifier
 * so tests can assert on notification calls without faking the whole service.
 */
export function createApp(services?: PartialRegistrationsApiServices) {
  const registrations =
    services?.registrationsService ??
    (services?.notifier
      ? new RegistrationsServiceImpl(undefined, services.notifier)
      : defaultRegistrations);
  const verifyToken = services?.verifyToken ?? verifyAuthToken;

  return new Elysia({ adapter: node(), prefix: "/api" })
    .onError(mapError)
    .resolve(requireAuth(verifyToken))
    .post(
      "/registrations/:universityId/:classId",
      ({ caller, params, body }) =>
        registrations.register(
          caller,
          params.universityId,
          params.classId,
          body,
        ),
      {
        body: RegisterRequestSchema,
        response: RegistrationResponseSchema,
      },
    )
    .delete(
      "/registrations/:universityId/:classId/:scoutId",
      async ({ caller, params, set }) => {
        await registrations.cancel(
          caller,
          params.universityId,
          params.classId,
          params.scoutId,
        );
        set.status = 204;
      },
    )
    .get(
      "/registrations/:universityId",
      ({ caller, params }) =>
        registrations.listSchedule(caller, params.universityId),
      { response: ScheduleResponseSchema },
    );
}

export const app = createApp();
