import type { PublicUniversity } from '#lib/api-types/universities-api.types.js';

/**
A published event with no periods and one class, for the page spec and the load spec.
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
  periods: [],
  classes: [
    {
      classId: 'cls1',
      badgeSlug: 'camping',
      badgeTitle: 'Camping',
      eagleRequired: true,
      periodIds: ['p1'],
      room: 'Room A',
      notes: null,
      capacity: 20,
      enrolledCount: 8,
      seatsRemaining: 12,
      waitlistCount: 0,
      counselors: [{ displayName: 'Alex Counselor' }],
    },
  ],
};
