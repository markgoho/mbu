import type {
  RegistrationResponse,
  RegistrationStatus,
} from '#lib/api-types/registrations-api.types.js';
import type { PublicClass, PublicUniversity } from '#lib/api-types/universities-api.types.js';
import type { ScoutResponse } from '#lib/api-types/users-api.types.js';

function publicClass(
  classId: string,
  badgeTitle: string,
  periodId: string,
  enrolledCount: number,
): PublicClass {
  const capacity = 10;
  return {
    classId,
    badgeSlug: classId,
    badgeTitle,
    eagleRequired: classId !== 'archery',
    periodIds: [periodId],
    room: null,
    notes: null,
    capacity,
    enrolledCount,
    seatsRemaining: capacity - enrolledCount,
    waitlistCount: 0,
    counselors: [],
  };
}

/**
 * An event with two periods and three classes, for the page spec and the load
 * spec. Camping and Archery are in period 1, and Hiking is in period 2.
 * Camping is full, so its action is "Join waitlist".
 */
export const sampleEvent: PublicUniversity = {
  id: 'uni1',
  title: 'Spring MBU',
  timezone: 'America/New_York',
  startDate: '2026-06-01T12:00:00.000Z',
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: '2026-05-25T23:59:59.000Z',
  location: {
    name: 'Scout Hall',
    address: '1 Main St',
    city: 'Anytown',
    state: 'NY',
    zip: '12345',
  },
  periods: [
    {
      periodId: 'p1',
      label: 'Period 1',
      startsAt: '2026-06-01T13:00:00.000Z',
      endsAt: '2026-06-01T14:00:00.000Z',
    },
    {
      periodId: 'p2',
      label: 'Period 2',
      startsAt: '2026-06-01T14:00:00.000Z',
      endsAt: '2026-06-01T15:00:00.000Z',
    },
  ],
  classes: [
    publicClass('camping', 'Camping', 'p1', 10),
    publicClass('archery', 'Archery', 'p1', 2),
    publicClass('hiking', 'Hiking', 'p2', 2),
  ],
};

export const alexSmith: ScoutResponse = {
  scoutId: 'scout1',
  firstName: 'Alex',
  lastName: 'Smith',
  unit: null,
  council: null,
  district: null,
  ageBand: null,
  bsaId: null,
  accommodations: null,
};

export const baileyJones: ScoutResponse = {
  ...alexSmith,
  scoutId: 'scout2',
  firstName: 'Bailey',
  lastName: 'Jones',
};

/**
The registration of a scout (the default is Alex Smith) for a class of `sampleEvent`.
*/
export function registrationFor(
  classId: string,
  status: RegistrationStatus,
  scoutId = alexSmith.scoutId,
): RegistrationResponse {
  const registeredClass = sampleEvent.classes.find((candidate) => candidate.classId === classId);
  if (!registeredClass) throw new Error(`The fixture has no class "${classId}".`);
  const timestamp = '2026-01-01T00:00:00.000Z';
  return {
    scoutId,
    classId,
    universityId: sampleEvent.id,
    status,
    periodIds: registeredClass.periodIds,
    badgeSlug: registeredClass.badgeSlug,
    badgeTitle: registeredClass.badgeTitle,
    waitlistedAt: status === 'waitlisted' ? timestamp : null,
    enrolledAt: status === 'enrolled' ? timestamp : null,
  };
}
