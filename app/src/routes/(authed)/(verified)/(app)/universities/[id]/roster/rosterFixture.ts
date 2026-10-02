import type { RosterResponse } from '#lib/api-types/registrations-api.types.js';

/**
 * The roster of the specs of this route: a class with one enrolled scout and
 * one waitlisted scout, and a class with no scouts.
 */
export const sampleRoster: RosterResponse = {
  university: {
    title: 'Spring MBU',
    startDate: '2026-06-01T12:00:00.000Z',
    endDate: null,
    location: {
      name: 'Scout Hall',
      address: '1 Main St',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    },
    timezone: 'America/New_York',
  },
  classRosters: [
    {
      class: {
        classId: 'cls1',
        badgeTitle: 'Camping',
        periodLabels: ['Period 1'],
        room: 'Room A',
        capacity: 10,
        enrolledCount: 1,
        waitlistCount: 1,
        counselorNames: ['Pat Counselor'],
      },
      enrolled: [
        {
          scoutId: 'scout1',
          scoutFirstName: 'Alex',
          scoutLastName: 'Smith',
          scoutUnit: 'Troop 1',
          accommodations: null,
          parentName: 'Jamie Smith',
          parentEmail: 'jamie@example.com',
          consentReceived: true,
          status: 'enrolled',
        },
      ],
      waitlisted: [
        {
          scoutId: 'scout2',
          scoutFirstName: 'Sam',
          scoutLastName: 'Jones',
          scoutUnit: null,
          accommodations: 'Wheelchair access',
          parentName: 'Robin Jones',
          parentEmail: 'robin@example.com',
          consentReceived: false,
          status: 'waitlisted',
        },
      ],
    },
    {
      class: {
        classId: 'cls2',
        badgeTitle: 'Archery',
        periodLabels: ['Period 2'],
        room: null,
        capacity: 5,
        enrolledCount: 0,
        waitlistCount: 0,
        counselorNames: [],
      },
      enrolled: [],
      waitlisted: [],
    },
  ],
};
