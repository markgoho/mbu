import type { ReviewQueueRow } from '#lib/api-types/universities-api.types.js';

/**
The queue row of the specs of this route: a submitted university with two classes.
*/
export const sampleRow: ReviewQueueRow = {
  id: 'uni1',
  title: 'Spring MBU',
  chancellorName: 'Alex Chancellor',
  chancellorEmail: 'alex@example.com',
  submittedAt: '2026-07-01T00:00:00.000Z',
  classCount: 2,
  startDate: '2026-06-01T12:00:00.000Z',
};
