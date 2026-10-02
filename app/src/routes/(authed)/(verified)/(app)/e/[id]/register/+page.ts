import type { ScheduleResponse } from '#lib/api-types/registrations-api.types.js';
import type { PublicUniversity } from '#lib/api-types/universities-api.types.js';
import type { ScoutListResponse } from '#lib/api-types/users-api.types.js';
import { apiFetchNoRedirect } from '#lib/api.js';
import { failLoad } from '#lib/loadFailure.js';
import { getSchedule } from '#lib/registrations.js';
import { listScouts } from '#lib/scouts.js';
import { getPublicUniversity } from '#lib/universities.js';
import type { PageLoad } from './$types';

/**
 * The data of the schedule builder: the public view of the event of the route
 * (with the seat counts of each class), the scouts of the parent, and the
 * registrations of those scouts in this event. The three requests run at the
 * same time.
 *
 * The page calls `refreshAll()` after each write, which runs this load
 * again: the seat counts and the registrations are then current.
 */
export const load: PageLoad = async ({ parent, params }) => {
  await parent();

  let event: PublicUniversity;
  let scoutList: ScoutListResponse;
  let schedule: ScheduleResponse;
  try {
    [event, scoutList, schedule] = await Promise.all([
      getPublicUniversity(apiFetchNoRedirect, params.id),
      listScouts(apiFetchNoRedirect),
      getSchedule(apiFetchNoRedirect, params.id),
    ]);
  } catch (loadError) {
    failLoad(loadError, { fallback: "We couldn't load this event. Please refresh to try again." });
  }
  return { event, scouts: scoutList.scouts, registrations: schedule.registrations };
};
