import type { UniversityDetailResponse } from '#lib/api-types/universities-api.types.js';

/**
The university of the specs of this route: a submitted event with one class.
*/
export const sampleDetail: UniversityDetailResponse = {
  university: {
    id: 'uni1',
    title: 'Spring MBU',
    status: 'submitted',
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
    createdByUid: 'u1',
    reviewNote: null,
    submittedAt: '2026-07-01T00:00:00.000Z',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  classes: [
    {
      classId: 'cls1',
      badgeSlug: 'camping',
      badgeTitle: 'Camping',
      eagleRequired: true,
      periodIds: [],
      capacity: 20,
      enrolledCount: 0,
      waitlistCount: 0,
      room: null,
      notes: null,
      counselors: [],
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
  ],
};
