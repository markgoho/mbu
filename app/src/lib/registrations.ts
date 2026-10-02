/**
 * The registrations API: the schedule of the scouts of a parent in one event,
 * and the rosters of an event for its chancellor.
 *
 * Each function is one request and takes the `Fetcher` first. A response that
 * is not OK throws an `ApiError`. The module keeps no state.
 */
import type {
  RegisterRequest,
  RegistrationResponse,
  RosterResponse,
  ScheduleResponse,
} from '#lib/api-types/registrations-api.types.js';
import { expectOk, getJson, sendJson } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';

const REGISTRATIONS_PATH = '/api/registrations';

/**
 * `GET /api/registrations/:universityId`: the registrations of the scouts of
 * the signed-in user in this event.
 */
export function getSchedule(fetcher: Fetcher, universityId: string): Promise<ScheduleResponse> {
  return getJson<ScheduleResponse>(fetcher, `${REGISTRATIONS_PATH}/${universityId}`);
}

/**
 * `GET /api/registrations/:universityId/roster`: the rosters of all classes of
 * the event. The API answers 403 for a user who is not the owner or a super admin.
 */
export function getRoster(fetcher: Fetcher, universityId: string): Promise<RosterResponse> {
  return getJson<RosterResponse>(fetcher, `${REGISTRATIONS_PATH}/${universityId}/roster`);
}

/**
`POST /api/registrations/:universityId/:classId`: registers a scout for a class.
*/
export function registerScout(
  fetcher: Fetcher,
  universityId: string,
  classId: string,
  body: RegisterRequest,
): Promise<RegistrationResponse> {
  return sendJson<RegistrationResponse>(
    fetcher,
    'POST',
    `${REGISTRATIONS_PATH}/${universityId}/${classId}`,
    body,
  );
}

/**
 * `DELETE /api/registrations/:universityId/:classId/:scoutId`: cancels the
 * registration of a scout for a class. The API answers 204.
 */
export async function cancelRegistration(
  fetcher: Fetcher,
  universityId: string,
  classId: string,
  scoutId: string,
): Promise<void> {
  await expectOk(
    await fetcher(`${REGISTRATIONS_PATH}/${universityId}/${classId}/${scoutId}`, {
      method: 'DELETE',
    }),
  );
}
